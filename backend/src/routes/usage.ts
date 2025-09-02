import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import { TokenService } from '../services/tokenService';
import logger from '../utils/logger';
import Joi from 'joi';

const router: Router = Router();

// Get user's token usage summary
router.get('/usage/summary',
  generalLimiter,
  authenticateToken,
  validate({
    query: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const summary = await TokenService.getUserSummary(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error fetching usage summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage summary'
      });
    }
  }
);

// Get detailed user statistics
router.get('/usage/stats',
  generalLimiter,
  authenticateToken,
  validate({
    query: Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const stats = await TokenService.getUserStats(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error fetching usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch usage statistics'
      });
    }
  }
);

// Get project-specific usage statistics
router.get('/projects/:projectId/usage',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      projectId: Joi.string().uuid().required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;

      const stats = await TokenService.getProjectStats(projectId, userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error fetching project usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project usage statistics'
      });
    }
  }
);

// Get agent-specific usage statistics
router.get('/agents/:agentId/usage',
  generalLimiter,
  authenticateToken,
  validate({
    params: Joi.object({
      agentId: Joi.string().uuid().required()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { agentId } = req.params;

      const stats = await TokenService.getAgentStats(agentId, userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      logger.error('Error fetching agent usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agent usage statistics'
      });
    }
  }
);

export default router;
