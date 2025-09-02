import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AgentModel } from '../models/Agent';
import { authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, creationLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

// Get all agents
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

// Get agent by ID
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

// Create new agent (admin functionality - for now, any authenticated user)
router.post('/', 
  creationLimiter,
  authenticateToken,
  validate({ body: commonSchemas.agent.create }),
  async (req: Request, res: Response) => {
    try {
      const agentData = req.body;
      
      const agent = await AgentModel.create(agentData);

      logger.info('Agent created', { agentId: agent.id, name: agent.name, createdBy: req.user!.id });

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

// Update agent
router.put('/:id', 
  generalLimiter,
  authenticateToken,
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

// Delete agent
router.delete('/:id', 
  generalLimiter,
  authenticateToken,
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

// Get agent usage statistics
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