import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { MessageModel } from '../models/Message';
import { ProjectModel } from '../models/Project';
import { authenticateToken, validateProjectAccess } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, chatLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

/**
 * @swagger
 * /api/messages/projects/{projectId}/messages:
 *   get:
 *     summary: Get all messages for project
 *     tags: [Messages]
 *     description: Retrieve paginated messages for a specific project
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
 *           default: 50
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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

/**
 * @swagger
 * /api/messages/projects/{projectId}/messages:
 *   post:
 *     summary: Create new message
 *     tags: [Messages]
 *     description: Create a new message in a project
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
 *             $ref: '#/components/schemas/MessageCreate'
 *     responses:
 *       201:
 *         description: Message created successfully
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
 *                     message:
 *                       $ref: '#/components/schemas/Message'
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

/**
 * @swagger
 * /api/messages/messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     description: Retrieve a specific message by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
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
 *                     message:
 *                       $ref: '#/components/schemas/Message'
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

/**
 * @swagger
 * /api/messages/messages/{id}:
 *   put:
 *     summary: Update message
 *     tags: [Messages]
 *     description: Update an existing message's content
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageUpdate'
 *     responses:
 *       200:
 *         description: Message updated successfully
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
 *                     message:
 *                       $ref: '#/components/schemas/Message'
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

/**
 * @swagger
 * /api/messages/messages/{id}:
 *   delete:
 *     summary: Delete message
 *     tags: [Messages]
 *     description: Delete a specific message by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
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
 *                   example: Message deleted successfully
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

/**
 * @swagger
 * /api/messages/projects/{projectId}/context:
 *   get:
 *     summary: Get conversation context
 *     tags: [Messages]
 *     description: Retrieve recent messages for AI conversation context
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 50
 *         description: Number of recent messages to retrieve
 *     responses:
 *       200:
 *         description: Context retrieved successfully
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
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *                     context_length:
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

/**
 * @swagger
 * /api/messages/projects/{projectId}/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     description: Search for messages within a project by content
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
 *         description: Maximum results to return
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageSearchResults'
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

/**
 * @swagger
 * /api/messages/projects/{projectId}/messages/stats:
 *   get:
 *     summary: Get message statistics
 *     tags: [Messages]
 *     description: Retrieve statistics about messages in a project
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
 *                   $ref: '#/components/schemas/MessageStats'
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

/**
 * @swagger
 * /api/messages/projects/{projectId}/messages:
 *   delete:
 *     summary: Delete all project messages
 *     tags: [Messages]
 *     description: Delete all messages in a specific project
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
 *         description: Messages cleared successfully
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
 *                 deleted_count:
 *                   type: number
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