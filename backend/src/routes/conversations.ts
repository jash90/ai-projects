import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ConversationModel } from '../models/Conversation';
import { AgentModel } from '../models/Agent';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router = Router();

// Get conversation between project and agent
router.get('/:projectId/:agentId', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const userId = req.user!.id;

      // Verify agent exists
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const conversation = await ConversationModel.findByProjectAndAgent(
        projectId, 
        agentId, 
        userId
      );

      res.json({
        success: true,
        data: {
          conversation: conversation || {
            id: null,
            project_id: projectId,
            agent_id: agentId,
            messages: [],
            created_at: null,
            updated_at: null
          }
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation'
      });
    }
  }
);

// Add message to conversation
router.post('/:projectId/:agentId/messages', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    }),
    body: Joi.object({
      role: Joi.string().valid('user', 'assistant').required(),
      content: Joi.string().min(1).max(50000).required(),
      metadata: Joi.object().optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const { role, content, metadata } = req.body;
      const userId = req.user!.id;

      // Verify agent exists
      const agent = await AgentModel.findById(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const message = {
        role,
        content,
        timestamp: new Date(),
        metadata
      };

      const conversation = await ConversationModel.addMessage(
        projectId,
        agentId,
        message,
        userId
      );

      logger.info('Message added to conversation', {
        projectId,
        agentId,
        userId,
        role,
        messageLength: content.length
      });

      res.status(201).json({
        success: true,
        data: {
          conversation
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error adding message to conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add message'
      });
    }
  }
);

// Clear conversation
router.delete('/:projectId/:agentId', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const userId = req.user!.id;

      const cleared = await ConversationModel.clearConversation(
        projectId,
        agentId,
        userId
      );

      logger.info('Conversation cleared', {
        projectId,
        agentId,
        userId,
        existed: cleared
      });

      res.json({
        success: true,
        message: 'Conversation cleared successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error clearing conversation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear conversation'
      });
    }
  }
);

// Get all conversations for a project
router.get('/:projectId', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;

      const conversations = await ConversationModel.getProjectConversations(
        projectId,
        userId
      );

      res.json({
        success: true,
        data: {
          conversations
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching project conversations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversations'
      });
    }
  }
);

// Get conversation statistics
router.get('/:projectId/:agentId/stats', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ 
      projectId: commonSchemas.uuid,
      agentId: commonSchemas.uuid
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { projectId, agentId } = req.params;
      const userId = req.user!.id;

      const stats = await ConversationModel.getConversationStats(
        projectId,
        agentId,
        userId
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      logger.error('Error fetching conversation stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch conversation statistics'
      });
    }
  }
);

export default router;
