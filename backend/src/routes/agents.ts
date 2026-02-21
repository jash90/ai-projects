import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AgentModel } from '../models/Agent';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, creationLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';
import { events as posthogEvents } from '../analytics/posthog';

const router: Router = Router();

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: Get all AI agents
 *     tags: [Agents]
 *     description: Retrieve a list of all available AI agents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Agents retrieved successfully
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
 *                     agents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agent'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', 
  generalLimiter,
  authenticateToken, 
  async (req: Request, res: Response) => {
    try {
      const agents = await AgentModel.findAll();

      res.json({
        success: true,
        data: {
          agents
        }
      });
    } catch (error) {
      logger.error('Error fetching agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agents'
      });
    }
  }
);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     summary: Get agent by ID
 *     tags: [Agents]
 *     description: Retrieve detailed information about a specific AI agent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent retrieved successfully
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
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
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
router.get('/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const agent = await AgentModel.findById(id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      res.json({
        success: true,
        data: {
          agent
        }
      });
    } catch (error) {
      logger.error('Error fetching agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent'
      });
    }
  }
);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: Create a new AI agent
 *     tags: [Agents]
 *     description: Create a new AI agent with custom configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentCreate'
 *     responses:
 *       201:
 *         description: Agent created successfully
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
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/',
  creationLimiter,
  authenticateToken,
  requireAdmin,
  validate({ body: commonSchemas.agent.create }),
  async (req: Request, res: Response) => {
    try {
      const agentData = req.body;
      
      const agent = await AgentModel.create(agentData);

      logger.info('Agent created', { agentId: agent.id, name: agent.name, createdBy: req.user!.id });

      try { posthogEvents.agentCreated(req.user!.id, { agentId: agent.id, provider: agent.provider, model: agent.model }); } catch {}

      res.status(201).json({
        success: true,
        data: {
          agent
        }
      });
    } catch (error) {
      logger.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create agent'
      });
    }
  }
);

/**
 * @swagger
 * /api/agents/{id}:
 *   put:
 *     summary: Update AI agent
 *     tags: [Agents]
 *     description: Update an existing AI agent's configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             $ref: '#/components/schemas/AgentUpdate'
 *     responses:
 *       200:
 *         description: Agent updated successfully
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
 *                     agent:
 *                       $ref: '#/components/schemas/Agent'
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
router.put('/:id',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  validate({
    params: Joi.object({ id: commonSchemas.uuid }),
    body: commonSchemas.agent.update
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const agent = await AgentModel.updateById(id, updates);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      logger.info('Agent updated', { agentId: id, updates: Object.keys(updates), updatedBy: req.user!.id });

      try { posthogEvents.agentUpdated(req.user!.id, { agentId: id, provider: agent.provider, model: agent.model }); } catch {}

      res.json({
        success: true,
        data: {
          agent
        }
      });
    } catch (error) {
      logger.error('Error updating agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update agent'
      });
    }
  }
);

/**
 * @swagger
 * /api/agents/{id}:
 *   delete:
 *     summary: Delete AI agent
 *     tags: [Agents]
 *     description: Delete an AI agent (only if not used in any conversations)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent deleted successfully
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
 *                   example: Agent deleted successfully
 *       400:
 *         description: Cannot delete agent in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id',
  generalLimiter,
  authenticateToken,
  requireAdmin,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const deleted = await AgentModel.deleteById(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      logger.info('Agent deleted', { agentId: id, deletedBy: req.user!.id });

      try { posthogEvents.agentDeleted(req.user!.id, { agentId: id }); } catch {}

      res.json({
        success: true,
        message: 'Agent deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('being used in conversations')) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete agent that is being used in conversations'
        });
      }

      logger.error('Error deleting agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete agent'
      });
    }
  }
);

/**
 * @swagger
 * /api/agents/{id}/stats:
 *   get:
 *     summary: Get agent usage statistics
 *     tags: [Agents]
 *     description: Retrieve usage statistics for a specific AI agent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent statistics retrieved successfully
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
 *                     agent_id:
 *                       type: string
 *                       format: uuid
 *                     conversations_using:
 *                       type: number
 *                       description: Number of conversations using this agent
 *                     can_delete:
 *                       type: boolean
 *                       description: Whether the agent can be safely deleted
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
router.get('/:id/stats', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const agent = await AgentModel.findById(id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found'
        });
      }

      const usageCount = await AgentModel.getUsageCount(id);

      res.json({
        success: true,
        data: {
          agent_id: id,
          conversations_using: usageCount,
          can_delete: usageCount === 0
        }
      });
    } catch (error) {
      logger.error('Error fetching agent stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent statistics'
      });
    }
  }
);

export default router;