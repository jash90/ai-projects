import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';
import logger from '../utils/logger';

const router: Router = Router();

// Apply authentication middleware to all settings routes
router.use(authenticateToken);

// Validation schemas
const profileUpdateSchema = {
  body: Joi.object({
    username: Joi.string().min(1).max(50).optional(),
    email: Joi.string().email().optional(),
  })
};

const passwordUpdateSchema = {
  body: Joi.object({
    current_password: Joi.string().min(1).required(),
    new_password: Joi.string().min(6).required(),
  })
};

const preferencesUpdateSchema = {
  body: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    notifications_enabled: Joi.boolean().optional(),
    email_notifications: Joi.boolean().optional(),
  })
};

/**
 * @swagger
 * /api/settings/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Settings]
 *     description: Retrieve current user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

/**
 * @swagger
 * /api/settings/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Settings]
 *     description: Update user profile information (username or email)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfileUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Email or username already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/profile', validate(profileUpdateSchema), async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const userId = req.user!.id;

    // Check if email is already taken (if updating email)
    if (updates.email) {
      const existingUser = await UserModel.findByEmail(updates.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          error: 'Email is already taken'
        });
      }
    }

    // Check if username is already taken (if updating username)
    if (updates.username) {
      const query = 'SELECT id FROM users WHERE username = $1 AND id != $2';
      const result = await UserModel.query(query, [updates.username, userId]);
      if (result.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Username is already taken'
        });
      }
    }

    const updatedUser = await UserModel.updateProfile(userId, updates);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

/**
 * @swagger
 * /api/settings/password:
 *   put:
 *     summary: Change password
 *     tags: [Settings]
 *     description: Update user password with current password verification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordUpdate'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Current password incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/password', validate(passwordUpdateSchema), async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user!.id;

    await UserModel.updatePassword(userId, current_password, new_password);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating password:', error);
    
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
});

/**
 * @swagger
 * /api/settings/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Settings]
 *     description: Retrieve user preferences (theme, notifications, etc.)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
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
 *                     preferences:
 *                       $ref: '#/components/schemas/UserPreferences'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const preferences = await UserModel.getUserPreferences(req.user!.id);
    
    res.json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    logger.error('Error getting user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user preferences'
    });
  }
});

/**
 * @swagger
 * /api/settings/preferences:
 *   put:
 *     summary: Update user preferences
 *     tags: [Settings]
 *     description: Update user preferences (theme, notifications, etc.)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PreferencesUpdate'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
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
 *                     preferences:
 *                       $ref: '#/components/schemas/UserPreferences'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/preferences', validate(preferencesUpdateSchema), async (req: Request, res: Response) => {
  try {
    const preferences = req.body;
    const userId = req.user!.id;

    const updatedPreferences = await UserModel.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      data: { preferences: updatedPreferences }
    });
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences'
    });
  }
});

/**
 * @swagger
 * /api/settings/usage:
 *   get:
 *     summary: Get user usage statistics
 *     tags: [Settings]
 *     description: Retrieve token usage statistics for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
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
 *                       $ref: '#/components/schemas/UsageSummary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await UserModel.getUserStatsById(userId);
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting user usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

export default router;
