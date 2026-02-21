import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { generateTokens, revokeToken, refreshAccessToken, authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';
import { events as posthogEvents, identifyUser } from '../analytics/posthog';
import { setUserContext, clearUserContext, captureException } from '../analytics';

const router: Router = Router();

// Cookie configuration for SSR auth
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * Helper to set auth cookies for SSR compatibility
 */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('auth_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes for access token
  });
  res.cookie('refresh_token', refreshToken, COOKIE_OPTIONS);
}

/**
 * Helper to clear auth cookies
 */
function clearAuthCookies(res: Response) {
  res.clearCookie('auth_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     description: Create a new user account and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/register',
  authLimiter,
  validate({ body: commonSchemas.user.register }),
  async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
        });
      }

      // Check if username is taken
      const existingUsername = await UserModel.usernameExists(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken'
        });
      }

      // Create user
      const user = await UserModel.create({ email, username, password });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });
      try { posthogEvents.userRegistered(user.id, { email: user.email, username: user.username }); identifyUser({ id: user.id, email: user.email, username: user.username, role: user.role }); } catch (e) { logger.debug('PostHog tracking failed', { error: e }); }
      setUserContext({ id: user.id, email: user.email, username: user.username, role: user.role });

      // Set auth cookies for SSR compatibility
      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global,
            token_limit_monthly: user.token_limit_monthly,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      captureException(error, { route: 'POST /api/auth/register' });
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     description: Authenticate user and receive JWT tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/login',
  authLimiter,
  validate({ body: commonSchemas.user.login }),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user with password
      const user = await UserModel.findByEmailWithPassword(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      // Set auth cookies for SSR compatibility
      setAuthCookies(res, accessToken, refreshToken);

      try {
        identifyUser({ id: user.id, email: user.email, username: user.username, role: user.role });
        setUserContext({ id: user.id, email: user.email, username: user.username, role: user.role });
        posthogEvents.userLoggedIn(user.id, { provider: 'email' });
      } catch {}

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global,
            token_limit_monthly: user.token_limit_monthly,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      captureException(error, { route: 'POST /api/auth/login' });
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     description: Get a new access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: New access token generated
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
 *                     access_token:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Support both body and cookie for refresh token (SSR compatibility)
    const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const accessToken = await refreshAccessToken(refresh_token);

    // Update access token cookie for SSR
    res.cookie('auth_token', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minutes for access token
    });

    res.json({
      success: true,
      data: {
        access_token: accessToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    // Clear cookies on refresh failure
    clearAuthCookies(res);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     description: Revoke access and refresh tokens
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Optional refresh token to revoke
 *     responses:
 *       200:
 *         description: Successfully logged out
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
 *                   example: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await revokeToken(token);
    }

    // Also revoke refresh token if provided (from body or cookie)
    const refresh_token = req.body.refresh_token || req.cookies?.refresh_token;
    if (refresh_token) {
      await revokeToken(refresh_token);
    }

    logger.info('User logged out successfully', { userId: req.user!.id });

    // Clear auth cookies
    clearAuthCookies(res);

    try {
      clearUserContext();
      posthogEvents.userLoggedOut(req.user!.id);
    } catch {}

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    captureException(error, { userId: req.user?.id });
    // Still clear cookies on error
    clearAuthCookies(res);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     description: Retrieve current user's profile information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         username:
 *                           type: string
 *                         created_at:
 *                           type: string
 *                           format: date-time
 *                         project_count:
 *                           type: number
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const projectCount = await UserModel.getProjectCount(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at,
          project_count: projectCount
        }
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    captureException(error, { userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     description: Update current user's profile information
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
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         username:
 *                           type: string
 *                         updated_at:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/profile',
  authenticateToken,
  validate({ body: commonSchemas.user.update }),
  async (req: Request, res: Response) => {
    try {
      const updates = req.body;
      const userId = req.user!.id;

      // Check if username is already taken by another user
      if (updates.username) {
        const existingUser = await UserModel.findByEmail(req.user!.email);
        if (existingUser && existingUser.username !== updates.username) {
          const usernameTaken = await UserModel.usernameExists(updates.username);
          if (usernameTaken) {
            return res.status(409).json({
              success: false,
              error: 'Username already taken'
            });
          }
        }
      }

      const updatedUser = await UserModel.updateById(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      logger.info('User profile updated', { userId, updates: Object.keys(updates) });

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            updated_at: updatedUser.updated_at
          }
        }
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      captureException(error, { userId: req.user?.id });
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     description: Verify if the JWT token is still valid and get fresh user data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get fresh user data from database to include role and other fields
    const user = await UserModel.findById(req.user!.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          token_limit_global: user.token_limit_global,
          token_limit_monthly: user.token_limit_monthly,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        valid: true
      }
    });
  } catch (error) {
    logger.error('Error verifying token:', error);
    captureException(error, { userId: req.user?.id, route: 'GET /api/auth/verify' });
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user data
 *     tags: [Authentication]
 *     description: Retrieve fresh user data for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data retrieved successfully
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
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
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
          email: user.email,
          username: user.username,
          role: user.role,
          token_limit_global: user.token_limit_global,
          token_limit_monthly: user.token_limit_monthly,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Error getting current user:', error);
    captureException(error, { userId: req.user?.id, route: 'GET /api/auth/me' });
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

export default router;
