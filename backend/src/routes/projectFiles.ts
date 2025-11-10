import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { FileModel } from '../models/File';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, creationLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * /api/projectFiles/projects/{projectId}/files:
 *   get:
 *     summary: Get all project files
 *     tags: [Project Files]
 *     description: Retrieve all editable text files for a project
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
 *                         $ref: '#/components/schemas/EditableFile'
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
router.get('/projects/:projectId/files', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid })
  }),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      console.log(`🔍 Fetching files for project ${projectId}, user ${userId}`);
      const dbStartTime = Date.now();
      const files = await FileModel.findByProjectId(projectId, userId);
      const dbEndTime = Date.now();
      
      const totalTime = Date.now() - startTime;
      console.log(`📊 Files API: Total ${totalTime}ms, DB query ${dbEndTime - dbStartTime}ms, ${files.length} files`);

      res.json({
        success: true,
        data: {
          files,
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

      logger.error('Error fetching project files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch files'
      });
    }
  }
);

/**
 * @swagger
 * /api/projectFiles/projects/{projectId}/files:
 *   post:
 *     summary: Create new project file
 *     tags: [Project Files]
 *     description: Create a new editable text file in a project
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileCreate'
 *     responses:
 *       201:
 *         description: File created successfully
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
 *                     file:
 *                       $ref: '#/components/schemas/EditableFile'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: File name conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/projects/:projectId/files', 
  creationLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      content: Joi.string().max(1000000).default(''),
      type: Joi.string().min(1).max(50).required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { name, content, type } = req.body;
      const userId = req.user!.id;

      // Check if file with same name already exists
      const existingFile = await FileModel.findByName(projectId, name, userId);
      if (existingFile) {
        return res.status(409).json({
          success: false,
          error: 'File with this name already exists'
        });
      }

      const file = await FileModel.create(projectId, {
        name,
        content,
        type
      }, userId);

      logger.info('File created', { 
        fileId: file.id, 
        projectId, 
        userId, 
        fileName: file.name,
        fileType: file.type
      });

      res.status(201).json({
        success: true,
        data: {
          file
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error creating file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create file'
      });
    }
  }
);

/**
 * @swagger
 * /api/projectFiles/files/{id}:
 *   get:
 *     summary: Get project file content
 *     tags: [Project Files]
 *     description: Retrieve a specific editable file by ID
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
 *                     file:
 *                       $ref: '#/components/schemas/EditableFile'
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
  validate({ 
    params: Joi.object({ id: commonSchemas.uuid })
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const file = await FileModel.findById(id, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      res.json({
        success: true,
        data: {
          file
        }
      });
    } catch (error) {
      logger.error('Error fetching file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch file'
      });
    }
  }
);

/**
 * @swagger
 * /api/projectFiles/files/{id}:
 *   put:
 *     summary: Update project file
 *     tags: [Project Files]
 *     description: Update a file's name, content, or type
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileUpdate'
 *     responses:
 *       200:
 *         description: File updated successfully
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
 *                     file:
 *                       $ref: '#/components/schemas/EditableFile'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: File name conflict
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/files/:id', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ id: commonSchemas.uuid }),
    body: Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      content: Joi.string().max(1000000).optional(),
      type: Joi.string().min(1).max(50).optional()
    }).min(1)
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      // If updating name, check for conflicts
      if (updates.name) {
        const existingFile = await FileModel.findById(id, userId);
        if (!existingFile) {
          return res.status(404).json({
            success: false,
            error: 'File not found'
          });
        }

        if (updates.name !== existingFile.name) {
          const conflictingFile = await FileModel.findByName(
            existingFile.project_id, 
            updates.name, 
            userId
          );
          if (conflictingFile) {
            return res.status(409).json({
              success: false,
              error: 'File with this name already exists'
            });
          }
        }
      }

      const file = await FileModel.updateById(id, updates, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      logger.info('File updated', { 
        fileId: id, 
        userId, 
        updates: Object.keys(updates)
      });

      res.json({
        success: true,
        data: {
          file
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error updating file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update file'
      });
    }
  }
);

/**
 * @swagger
 * /api/projectFiles/files/{id}:
 *   delete:
 *     summary: Delete project file
 *     tags: [Project Files]
 *     description: Delete an editable file from a project
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
  validate({ 
    params: Joi.object({ id: commonSchemas.uuid })
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const deleted = await FileModel.deleteById(id, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
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
 * /api/projectFiles/projects/{projectId}/files/search:
 *   get:
 *     summary: Search project files
 *     tags: [Project Files]
 *     description: Search for editable files by name or content
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
router.get('/projects/:projectId/files/search', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    query: Joi.object({
      q: Joi.string().min(1).max(255).required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { q: query } = req.query as any;
      const userId = req.user!.id;

      const files = await FileModel.searchFiles(projectId, query, userId);

      res.json({
        success: true,
        data: {
          files,
          query,
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
 * /api/projectFiles/projects/{projectId}/files/type/{type}:
 *   get:
 *     summary: Get files by type
 *     tags: [Project Files]
 *     description: Retrieve all files of a specific type/language
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
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: File type (e.g., typescript, javascript, markdown)
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
 *                         $ref: '#/components/schemas/EditableFile'
 *                     type:
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
router.get('/projects/:projectId/files/type/:type', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      type: Joi.string().required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, type } = req.params;
      const userId = req.user!.id;

      const files = await FileModel.getFilesByType(projectId, type, userId);

      res.json({
        success: true,
        data: {
          files,
          type,
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
 * /api/projectFiles/projects/{projectId}/files/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Project Files]
 *     description: Retrieve statistics about editable files in a project
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
router.get('/projects/:projectId/files/stats', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const stats = await FileModel.getProjectFileStats(projectId, userId);

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
