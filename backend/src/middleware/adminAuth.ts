import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';
import logger from '../utils/logger';

/**
 * Middleware to check if the authenticated user has admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated (should be handled by authenticateToken middleware first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user details from database to check role
    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt by user ${user.email}`);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    // Add admin user to request for logging purposes
    (req as any).adminUser = user;
    next();
  } catch (error) {
    logger.error('Error in admin authentication middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Middleware to log admin activities
 */
export const logAdminActivity = (actionType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUser = (req as any).adminUser;
      if (!adminUser) {
        return next();
      }

      // Extract target user ID from params or body
      const targetUserId = req.params.userId || req.body.user_id || req.params.id;
      
      // Log the activity
      await UserModel.logAdminActivity(
        adminUser.id,
        actionType,
        targetUserId,
        {
          method: req.method,
          path: req.path,
          body: req.method !== 'GET' ? req.body : undefined,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      next();
    } catch (error) {
      logger.error('Error logging admin activity:', error);
      // Don't fail the request if logging fails
      next();
    }
  };
};
