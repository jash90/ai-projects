import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { FileModel } from '../models/File';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, creationLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

// Get all files for a project
router.get('/projects/:projectId/files', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const files = await FileModel.findByProjectId(projectId, userId);

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

// Create new file in project
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

// Get file by ID
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

// Update file
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

// Delete file
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

// Search files in project
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

// Get files by type
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

// Get file statistics for project
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
