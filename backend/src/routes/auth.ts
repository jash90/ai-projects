import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { generateTokens, revokeToken, refreshAccessToken, authenticateToken } from '../middleware/auth';
import { validate, commonSchemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimiting';
import logger from '../utils/logger';

const router: Router = Router();

// Register new user
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
        username: user.username,
        role: user.role
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

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
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
);

// Login user
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
        username: user.username,
        role: user.role
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

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
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
);

// Refresh access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const accessToken = await refreshAccessToken(refresh_token);

    res.json({
      success: true,
      data: {
        access_token: accessToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      await revokeToken(token);
    }

    // Also revoke refresh token if provided
    const { refresh_token } = req.body;
    if (refresh_token) {
      await revokeToken(refresh_token);
    }

    logger.info('User logged out successfully', { userId: req.user!.id });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Get current user profile
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update user profile
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
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
);

// Verify token (for frontend to check if token is still valid)
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
    res.status(500).json({
      success: false,
      error: 'Failed to verify token'
    });
  }
});

// Get current user (refresh user data)
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
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

export default router;