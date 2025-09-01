import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ProjectModel } from '../models/Project';
import { authenticateToken, validateProjectAccess } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { generalLimiter, creationLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router = Router();

// Get all projects for the current user
router.get('/', 
  generalLimiter,
  authenticateToken,
  validate({ query: commonSchemas.pagination }),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search } = req.query as any;
      const userId = req.user!.id;

      const result = await ProjectModel.findByUserId(userId, page, limit, search);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch projects'
      });
    }
  }
);

// Get recent projects
router.get('/recent', 
  generalLimiter,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 5;

      const projects = await ProjectModel.getRecentActivity(userId, limit);

      res.json({
        success: true,
        data: {
          projects
        }
      });
    } catch (error) {
      logger.error('Error fetching recent projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent projects'
      });
    }
  }
);

// Search projects
router.get('/search', 
  generalLimiter,
  authenticateToken,
  validate({ 
    query: Joi.object({
      q: Joi.string().min(1).max(255).required(),
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { q: query, limit = 10 } = req.query as any;
      const userId = req.user!.id;

      const projects = await ProjectModel.searchProjects(userId, query, limit);

      res.json({
        success: true,
        data: {
          projects,
          query
        }
      });
    } catch (error) {
      logger.error('Error searching projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search projects'
      });
    }
  }
);

// Get project by ID
router.get('/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const project = await ProjectModel.findById(id, userId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      res.json({
        success: true,
        data: {
          project
        }
      });
    } catch (error) {
      logger.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch project'
      });
    }
  }
);

// Create new project
router.post('/', 
  creationLimiter,
  authenticateToken,
  validate({ body: commonSchemas.project.create }),
  async (req: Request, res: Response) => {
    try {
      const projectData = req.body;
      const userId = req.user!.id;

      const project = await ProjectModel.create({
        ...projectData,
        user_id: userId
      });

      logger.info('Project created', { 
        projectId: project.id, 
        userId
      });

      res.status(201).json({
        success: true,
        data: {
          project
        }
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project'
      });
    }
  }
);

// Update project
router.put('/:id', 
  generalLimiter,
  authenticateToken,
  validate({ 
    params: Joi.object({ id: commonSchemas.uuid }),
    body: commonSchemas.project.update 
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user!.id;

      const project = await ProjectModel.updateById(id, userId, updates);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      logger.info('Project updated', { projectId: id, userId, updates: Object.keys(updates) });

      res.json({
        success: true,
        data: {
          project
        }
      });
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project'
      });
    }
  }
);

// Delete project
router.delete('/:id', 
  generalLimiter,
  authenticateToken,
  validate({ params: Joi.object({ id: commonSchemas.uuid }) }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const deleted = await ProjectModel.deleteById(id, userId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      logger.info('Project deleted', { projectId: id, userId });

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project'
      });
    }
  }
);

export default router;