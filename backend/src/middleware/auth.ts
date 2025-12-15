import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { redis } from '../database/connection';
import { UserModel } from '../models/User';
import { JwtPayload, AuthUser } from '../types';
import config from '../utils/config';
import logger from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been revoked'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt_secret as string) as JwtPayload;

    // Check if user still exists
    const user = await UserModel.findById(decoded.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    // Note: TokenExpiredError is a subclass of JsonWebTokenError, so check it first
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

export function generateTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
  const payload = {
    user_id: user.id,
    email: user.email,
  };

  const accessTokenOptions: SignOptions = {
    expiresIn: config.jwt_expires_in as StringValue | number,
  };
  
  const refreshTokenOptions: SignOptions = {
    expiresIn: '30d', // Refresh tokens last longer
  };

  const accessToken = jwt.sign(payload, config.jwt_secret, accessTokenOptions);
  const refreshToken = jwt.sign(payload, config.jwt_secret, refreshTokenOptions);

  return { accessToken, refreshToken };
}

export async function revokeToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await redis.setEx(`blacklist:${token}`, expiresIn, 'revoked');
      }
    }
  } catch (error) {
    logger.error('Error revoking token:', error);
    throw error;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    // Check if refresh token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt_secret as string) as JwtPayload;

    // Check if user still exists
    const user = await UserModel.findById(decoded.user_id);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new access token
    const payload = {
      user_id: user.id,
      email: user.email,
    };

    const tokenOptions: SignOptions = {
      expiresIn: config.jwt_expires_in as StringValue | number,
    };
    
    return jwt.sign(payload, config.jwt_secret, tokenOptions);
  } catch (error) {
    logger.error('Token refresh error:', error);
    throw error;
  }
}

export async function validateProjectAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const projectId = req.params.projectId || req.params.id;
    const userId = req.user!.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID required'
      });
    }

    // Check if user owns the project (this will be verified in the model methods)
    // We'll let the model handle the ownership verification for efficiency
    req.params.projectId = projectId;
    next();
  } catch (error) {
    logger.error('Project access validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Access validation failed'
    });
  }
}