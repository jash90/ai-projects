import { Request } from 'express';
import jwt from 'jsonwebtoken';
import config from '../utils/config';
import { UserModel } from '../models/User';
import logger from '../utils/logger';

export interface JwtPayload {
  user_id: string;
  email: string;
  username: string;
  role: string;
}

/**
 * Custom authentication error for tsoa
 * Extends Error to include HTTP status code
 */
export class AuthenticationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

/**
 * Express authentication middleware for tsoa
 * Handles JWT bearer token validation
 */
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === 'jwt') {
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new AuthenticationError('Access token required', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Invalid authorization header format', 401);
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;

      // Fetch user from database
      const user = await UserModel.findById(decoded.user_id);

      if (!user) {
        throw new AuthenticationError('User not found', 401);
      }

      if (!user.is_active) {
        throw new AuthenticationError('User account is inactive', 403);
      }

      // Check role-based scopes if specified
      if (scopes && scopes.length > 0) {
        const hasRequiredRole = scopes.includes(user.role);

        if (!hasRequiredRole) {
          throw new AuthenticationError(`Insufficient permissions. Required: ${scopes.join(' or ')}`, 403);
        }
      }

      // Attach user info to request for controller access
      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      };

      return request.user;

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token', 401);
      }

      // Re-throw AuthenticationError as-is (user not found, inactive, permissions)
      if (error instanceof AuthenticationError) {
        throw error;
      }

      // Other unexpected errors
      throw new AuthenticationError('Authentication failed', 401);
    }
  }

  throw new AuthenticationError(`Unknown security name: ${securityName}`, 500);
}
