import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ConversationModel } from '../models/Conversation';
import { AgentModel } from '../models/Agent';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * /api/conversations/{projectId}/{agentId}:
 *   get:
 *     summary: Get conversation history
 *     tags: [Conversations]
 *     description: Retrieve conversation history between a project and an AI agent
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
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
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
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /api/conversations/{projectId}/{agentId}/messages:
 *   post:
 *     summary: Add message to conversation
 *     tags: [Conversations]
 *     description: Manually add a message to an existing conversation
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
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant]
 *                 description: Message sender role
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50000
 *                 description: Message content
 *               metadata:
 *                 $ref: '#/components/schemas/MessageMetadata'
 *             required:
 *               - role
 *               - content
 *     responses:
 *       201:
 *         description: Message added successfully
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
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /api/conversations/{projectId}/{agentId}:
 *   delete:
 *     summary: Delete conversation
 *     tags: [Conversations]
 *     description: Clear/delete all messages in a conversation
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
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Conversation cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Conversation cleared successfully
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

/**
 * @swagger
 * /api/conversations/{projectId}:
 *   get:
 *     summary: Get all conversations for project
 *     tags: [Conversations]
 *     description: Retrieve all conversations associated with a specific project
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
 *         description: Conversations retrieved successfully
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
 *                     conversations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
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

/**
 * @swagger
 * /api/conversations/{projectId}/{agentId}/stats:
 *   get:
 *     summary: Get conversation statistics
 *     tags: [Conversations]
 *     description: Retrieve statistics for a specific conversation
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
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Conversation statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ConversationStats'
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
