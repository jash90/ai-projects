import { Router, Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFileModel } from '../models/ProjectFile';
import { FileModel } from '../models/File';
import { ProjectModel } from '../models/Project';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas, validateFileUpload } from '../middleware/validation';
import { generalLimiter, uploadLimiter } from '../middleware/rateLimiting';
import config from '../utils/config';
import logger from '../utils/logger';

const router: Router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: config.max_file_size,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = config.allowed_file_types;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(config.upload_path);
  } catch {
    await fs.mkdir(config.upload_path, { recursive: true });
  }
}

/**
 * @swagger
 * /api/files/projects/{projectId}/uploads:
 *   get:
 *     summary: Get uploaded files for project
 *     tags: [Files]
 *     description: Retrieve paginated list of uploaded files for a specific project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/projects/:projectId/uploads', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    query: commonSchemas.pagination
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 20 } = req.query as any;
      const userId = req.user!.id;

      const result = await ProjectFileModel.findByProjectId(projectId, userId, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error fetching files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/projects/{projectId}/uploads:
 *   post:
 *     summary: Upload file to project
 *     tags: [Files]
 *     description: Upload a file to a project (max 10MB)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *             required:
 *               - file
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/projects/:projectId/uploads', 
  uploadLimiter,
  authenticateToken,
  upload.single('file'),
  validateFileUpload,
  validate({ params: Joi.object({ projectId: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const uploadedFile = req.file!;

      // Verify project exists and user has access
      const project = await ProjectModel.findById(projectId, userId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      await ensureUploadDir();

      // Generate unique filename
      const fileExtension = path.extname(uploadedFile.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filepath = path.join(config.upload_path, filename);

      // Write file to disk (text files only)
      await fs.writeFile(filepath, uploadedFile.buffer);

      // Save file record to database
      const file = await ProjectFileModel.create({
        project_id: projectId,
        filename,
        original_name: uploadedFile.originalname,
        mimetype: uploadedFile.mimetype,
        size: uploadedFile.buffer.length,
        path: filepath,
        uploaded_by: userId,
      });

      logger.info('File uploaded', { 
        fileId: file.id, 
        projectId, 
        userId, 
        filename: file.original_name,
        size: file.size
      });

      res.status(201).json({
        success: true,
        data: {
          file: {
            ...file,
            path: undefined // Don't expose file system path
          }
        }
      });
    } catch (error) {
      logger.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/files/{id}:
 *   get:
 *     summary: Get file metadata
 *     tags: [Files]
 *     description: Retrieve file metadata and content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File retrieved successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/files/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const file = await ProjectFileModel.findById(id, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Check if file exists on disk
      try {
        await fs.access(file.path);
      } catch {
        logger.error('File not found on disk', { fileId: id, path: file.path });
        return res.status(404).json({
          success: false,
          error: 'File not found on disk'
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Content-Length', file.size);
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);

      // Stream file
      const fileBuffer = await fs.readFile(file.path);
      res.send(fileBuffer);
    } catch (error) {
      logger.error('Error serving file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve file'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/files/{id}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
 *     description: Download a file with attachment disposition
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File download initiated
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/files/:id/download', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const file = await ProjectFileModel.findById(id, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Check if file exists on disk
      try {
        await fs.access(file.path);
      } catch {
        logger.error('File not found on disk', { fileId: id, path: file.path });
        return res.status(404).json({
          success: false,
          error: 'File not found on disk'
        });
      }

      // Set download headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', file.size);
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);

      // Stream file
      const fileBuffer = await fs.readFile(file.path);
      res.send(fileBuffer);
    } catch (error) {
      logger.error('Error downloading file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to download file'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     description: Delete a file from project and file system
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/files/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get file path before deletion
      const filePath = await ProjectFileModel.getFilePath(id, userId);
      if (!filePath) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Delete from database
      const deleted = await ProjectFileModel.deleteById(id, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Delete from file system
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn('File not found on disk during deletion', { fileId: id, path: filePath });
      }

      logger.info('File deleted', { fileId: id, userId });

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/projects/{projectId}/uploads/type/{mimetype}:
 *   get:
 *     summary: Get files by MIME type
 *     tags: [Files]
 *     description: Retrieve all files of a specific MIME type for a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: path
 *         name: mimetype
 *         required: true
 *         schema:
 *           type: string
 *         description: MIME type (e.g., application/pdf)
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProjectFile'
 *                     mimetype:
 *                       type: string
 *                     count:
 *                       type: number
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/projects/:projectId/uploads/type/:mimetype', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      mimetype: Joi.string().required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, mimetype } = req.params;
      const userId = req.user!.id;

      const files = await ProjectFileModel.getFilesByMimetype(projectId, userId, mimetype);

      res.json({
        success: true,
        data: {
          files,
          mimetype,
          count: files.length
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error fetching files by type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files by type'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/projects/{projectId}/uploads/search:
 *   get:
 *     summary: Search uploaded files
 *     tags: [Files]
 *     description: Search for files by filename within a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum results
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileSearchResults'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/projects/:projectId/uploads/search', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    query: Joi.object({
      q: Joi.string().min(1).max(255).required(),
      limit: Joi.number().integer().min(1).max(50).default(20)
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { q: query, limit = 20 } = req.query as any;
      const userId = req.user!.id;

      const files = await ProjectFileModel.searchFiles(projectId, userId, query, limit);

      res.json({
        success: true,
        data: {
          files,
          query,
          results_count: files.length
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error searching files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search files'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/projects/{projectId}/uploads/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Files]
 *     description: Retrieve statistics about uploaded files in a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FileStats'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/projects/:projectId/uploads/stats', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ projectId: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const stats = await ProjectFileModel.getProjectStats(projectId, userId);

      res.json({
        success: true,
        data: {
          project_id: projectId,
          ...stats
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error fetching file stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch file statistics'
      });
    }
  }
);

/**
 * @swagger
 * /api/files/files/{id}/migrate-markdown:
 *   post:
 *     summary: Migrate file to Markdown
 *     tags: [Files]
 *     description: Convert a file to Markdown type for enhanced editing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *     responses:
 *       200:
 *         description: File migrated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/files/:id/migrate-markdown',
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get the file
      const file = await FileModel.findById(id, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      // Update file type to markdown
      await FileModel.updateById(id, { type: 'markdown' }, userId);

      logger.info('File migrated to Markdown', { 
        fileId: id, 
        userId, 
        fileName: file.name
      });

      res.json({
        success: true,
        data: { message: 'File migrated to Markdown successfully' }
      });
    } catch (error) {
      logger.error('Error migrating file to Markdown:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to migrate file to Markdown'
      });
    }
  }
);

export default router;