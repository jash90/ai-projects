import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { MessageModel } from '../models/Message';
import { ProjectModel } from '../models/Project';
import { authenticateToken, validateProjectAccess } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, chatLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router = Router();

// Get messages for a project
router.get('/projects/:projectId/messages', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    query: commonSchemas.pagination
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 50 } = req.query as any;
      const userId = req.user!.id;

      const result = await MessageModel.findByProjectId(projectId, userId, page, limit);

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

      logger.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages'
      });
    }
  }
);

// Create new message
router.post('/projects/:projectId/messages', 
  chatLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    body: commonSchemas.message.create
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const messageData = req.body;
      const userId = req.user!.id;

      // Verify project exists and user has access
      const project = await ProjectModel.findById(projectId, userId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const message = await MessageModel.create(projectId, messageData);

      logger.info('Message created', { 
        messageId: message.id, 
        projectId, 
        userId, 
        role: message.role 
      });

      res.status(201).json({
        success: true,
        data: {
          message
        }
      });
    } catch (error) {
      logger.error('Error creating message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create message'
      });
    }
  }
);

// Get message by ID
router.get('/messages/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const message = await MessageModel.findById(id, userId);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      res.json({
        success: true,
        data: {
          message
        }
      });
    } catch (error) {
      logger.error('Error fetching message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch message'
      });
    }
  }
);

// Update message
router.put('/messages/:id', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ id: commonSchemas.uuid }),
    body: commonSchemas.message.update 
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      const message = await MessageModel.updateById(id, userId, updates);
      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      logger.info('Message updated', { messageId: id, userId, updates: Object.keys(updates) });

      res.json({
        success: true,
        data: {
          message
        }
      });
    } catch (error) {
      logger.error('Error updating message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update message'
      });
    }
  }
);

// Delete message
router.delete('/messages/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const deleted = await MessageModel.deleteById(id, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      logger.info('Message deleted', { messageId: id, userId });

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message'
      });
    }
  }
);

// Get conversation context for AI
router.get('/projects/:projectId/context', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ projectId: commonSchemas.uuid }),
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(20)
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const { limit = 20 } = req.query as any;
      const userId = req.user!.id;

      const messages = await MessageModel.getConversationContext(projectId, userId, limit);

      res.json({
        success: true,
        data: {
          messages,
          context_length: messages.length
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error fetching conversation context:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation context'
      });
    }
  }
);

// Search messages in a project
router.get('/projects/:projectId/messages/search', 
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

      const messages = await MessageModel.searchMessages(projectId, userId, query, limit);

      res.json({
        success: true,
        data: {
          messages,
          query,
          results_count: messages.length
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error searching messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search messages'
      });
    }
  }
);

// Get message statistics for a project
router.get('/projects/:projectId/messages/stats', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ projectId: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const stats = await MessageModel.getMessageStats(projectId, userId);

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

      logger.error('Error fetching message stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch message statistics'
      });
    }
  }
);

// Clear all messages in a project
router.delete('/projects/:projectId/messages', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ projectId: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const deletedCount = await MessageModel.deleteByProjectId(projectId, userId);

      logger.info('All messages cleared from project', { projectId, userId, deletedCount });

      res.json({
        success: true,
        message: `${deletedCount} messages cleared successfully`,
        deleted_count: deletedCount
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }

      logger.error('Error clearing messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear messages'
      });
    }
  }
);

export default router;