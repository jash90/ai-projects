import { Router, Request, Response } from 'express';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ProjectFileModel } from '../models/ProjectFile';
import { ProjectModel } from '../models/Project';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas, validateFileUpload } from '../middleware/validation';
import { generalLimiter, uploadLimiter } from '../middleware/rateLimiting';
import config from '../utils/config';
import logger from '../utils/logger';

const router = Router();

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

// Get uploaded files for a project
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

// Upload file to project
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

// Get file by ID (for download/view)
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

// Download file (with Content-Disposition: attachment)
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

// Delete file
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

// Get files by type for a project
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

// Search files in a project
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

// Get file statistics for a project
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

export default router;