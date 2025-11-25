import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, logAdminActivity } from '../middleware/adminAuth';
import { validate } from '../middleware/validation';
import { UserModel } from '../models/User';
import { TokenLimitUpdate } from '../types';
import { pool } from '../database/connection';
import Joi from 'joi';
import logger from '../utils/logger';

const router: Router = Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation schemas
const updateTokenLimitsSchema = Joi.object({
  user_id: Joi.string().uuid().optional(),
  global_limit: Joi.number().integer().min(0).optional(),
  monthly_limit: Joi.number().integer().min(0).optional(),
}).min(1);

const toggleUserStatusSchema = Joi.object({
  is_active: Joi.boolean().required(),
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     description: Retrieve comprehensive platform statistics for admin dashboard
 *     security:
 *       - bearerAuth: []
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
 *                   $ref: '#/components/schemas/AdminStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await UserModel.getAdminStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin statistics'
    });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     description: Retrieve paginated list of all users with filtering options
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email or username
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by role
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by account status
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserList'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as 'user' | 'admin';
    const status = req.query.status as 'active' | 'inactive';

    let query = 'SELECT * FROM user_management_view WHERE 1=1';
    const values: any[] = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (email ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      query += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    if (status) {
      const isActive = status === 'active';
      query += ` AND is_active = $${paramCount}`;
      values.push(isActive);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace('SELECT * FROM user_management_view', 'SELECT COUNT(*) as total FROM user_management_view');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching users for admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Admin]
 *     description: Retrieve detailed usage statistics for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserUsageStats'
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
router.get('/users/:userId/stats', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const stats = await UserModel.getUserStatsById(userId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

/**
 * @swagger
 * /api/admin/token-limits:
 *   put:
 *     summary: Update global token limits
 *     tags: [Admin]
 *     description: Update global default token limits for all users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenLimitUpdate'
 *     responses:
 *       200:
 *         description: Token limits updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
router.put('/token-limits', 
  validate({ body: updateTokenLimitsSchema }),
  logAdminActivity('update_token_limits'),
  async (req: Request, res: Response) => {
    try {
      const updates: TokenLimitUpdate = req.body;
      const success = await UserModel.updateTokenLimits(updates);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update token limits'
        });
      }

      res.json({
        success: true,
        message: updates.user_id ? 'User token limits updated' : 'Global token limits updated'
      });
    } catch (error) {
      logger.error('Error updating token limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update token limits'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/token-limits:
 *   get:
 *     summary: Get global token limits
 *     tags: [Admin]
 *     description: Retrieve current global default token limits
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token limits retrieved successfully
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
 *                     global_limit:
 *                       type: number
 *                       nullable: true
 *                     monthly_limit:
 *                       type: number
 *                       nullable: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/token-limits', async (req: Request, res: Response) => {
  try {
    const limits = await UserModel.getGlobalTokenLimits();

    // Standardize response field names to match API schema
    res.json({
      success: true,
      data: {
        global_limit: limits.global,
        monthly_limit: limits.monthly
      }
    });
  } catch (error) {
    logger.error('Error fetching token limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch token limits'
    });
  }
});

/**
 * @swagger
 * /api/admin/users/{userId}/status:
 *   put:
 *     summary: Update user status
 *     tags: [Admin]
 *     description: Activate or deactivate a user account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserStatusUpdate'
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
router.put('/users/:userId/status',
  validate({ body: toggleUserStatusSchema }),
  logAdminActivity('toggle_user_status'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { is_active } = req.body;
      
      const success = await UserModel.toggleUserStatus(userId, is_active);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      logger.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user status'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/users/{userId}/token-limits:
 *   put:
 *     summary: Update user token limits
 *     tags: [Admin]
 *     description: Update token limits for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TokenLimitUpdate'
 *     responses:
 *       200:
 *         description: User token limits updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
router.put('/users/:userId/token-limits',
  validate({ body: updateTokenLimitsSchema }),
  logAdminActivity('update_user_token_limits'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates: TokenLimitUpdate = {
        user_id: userId,
        ...req.body
      };
      
      const success = await UserModel.updateTokenLimits(updates);
      
      if (!success) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update user token limits'
        });
      }

      res.json({
        success: true,
        message: 'User token limits updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user token limits:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user token limits'
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/activity:
 *   get:
 *     summary: Get admin activity log
 *     tags: [Admin]
 *     description: Retrieve paginated admin activity log with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Items per page
 *       - in: query
 *         name: admin_user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by admin user ID
 *       - in: query
 *         name: action_type
 *         schema:
 *           type: string
 *         description: Filter by action type
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
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
 *                     activities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityLog'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const adminUserId = req.query.admin_user_id as string;
    const actionType = req.query.action_type as string;

    let query = `
      SELECT 
        aal.*,
        admin_user.email as admin_email,
        admin_user.username as admin_username,
        target_user.email as target_email,
        target_user.username as target_username
      FROM admin_activity_log aal
      LEFT JOIN users admin_user ON aal.admin_user_id = admin_user.id
      LEFT JOIN users target_user ON aal.target_user_id = target_user.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (adminUserId) {
      query += ` AND aal.admin_user_id = $${paramCount}`;
      values.push(adminUserId);
      paramCount++;
    }

    if (actionType) {
      query += ` AND aal.action_type = $${paramCount}`;
      values.push(actionType);
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT aal.*, admin_user.email as admin_email, admin_user.username as admin_username, target_user.email as target_email, target_user.username as target_username FROM admin_activity_log aal LEFT JOIN users admin_user ON aal.admin_user_id = admin_user.id LEFT JOIN users target_user ON aal.target_user_id = target_user.id',
      'SELECT COUNT(*) as total FROM admin_activity_log aal'
    );
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Add pagination and ordering
    query += ` ORDER BY aal.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, (page - 1) * limit);

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: {
        activities: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching admin activity log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity log'
    });
  }
});

export default router;
