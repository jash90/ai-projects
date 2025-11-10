import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiting';
import { TokenService } from '../services/tokenService';
import logger from '../utils/logger';
import Joi from 'joi';

const router: Router = Router();

/**
 * @swagger
 * /api/usage/usage/summary:
 *   get:
 *     summary: Get usage summary
 *     tags: [Usage]
 *     description: Retrieve token usage summary for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for usage period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for usage period
 *     responses:
 *       200:
 *         description: Usage summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UsageSummary'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /api/usage/usage/stats:
 *   get:
 *     summary: Get detailed usage statistics
 *     tags: [Usage]
 *     description: Retrieve detailed token usage statistics with breakdowns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics period
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
 *                   type: object
 *                   properties:
 *                     stats:
 *                       $ref: '#/components/schemas/UsageStats'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /api/usage/projects/{projectId}/usage:
 *   get:
 *     summary: Get project usage statistics
 *     tags: [Usage]
 *     description: Retrieve token usage statistics for a specific project
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
 *         description: Project usage retrieved successfully
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
 *                     stats:
 *                       $ref: '#/components/schemas/ProjectUsage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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

/**
 * @swagger
 * /api/usage/agents/{agentId}/usage:
 *   get:
 *     summary: Get agent usage statistics
 *     tags: [Usage]
 *     description: Retrieve token usage statistics for a specific AI agent
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent usage retrieved successfully
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
 *                     stats:
 *                       $ref: '#/components/schemas/AgentUsage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
