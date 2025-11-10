import {
  Body,
  Controller,
  Get,
  Post,
  Route,
  Security,
  SuccessResponse,
  Response as TsoaResponse,
  Tags,
  Request
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import type { User } from '../types';
import { UserModel } from '../models/User';
import { generateTokens, revokeToken, refreshAccessToken } from '../middleware/auth';
import { ErrorResponse, MessageResponse } from './shared/types';
import logger from '../utils/logger';

// ===== Interfaces =====

interface Tokens {
  access_token: string;
  refresh_token: string;
}

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refresh_token: string;
}

interface LogoutRequest {
  refresh_token?: string;
}

// ===== Success Response Types =====

interface RegisterResponse {
  success: true;
  data: {
    user: User;
    tokens: Tokens;
  };
}

interface LoginResponse {
  success: true;
  data: {
    user: User;
    tokens: Tokens;
  };
}

interface RefreshTokenResponse {
  success: true;
  data: {
    access_token: string;
  };
}

interface LogoutResponse extends MessageResponse {}

interface GetMeResponse {
  success: true;
  data: {
    user: User;
  };
}

interface VerifyResponse {
  success: true;
  data: {
    user: User;
    valid: boolean;
  };
}

/**
 * Authentication Management
 *
 * Endpoints for user registration, login, token refresh, logout, and profile retrieval.
 */
@Route('auth')
@Tags('Authentication')
export class AuthController extends Controller {
  /**
   * Register new user
   *
   * Creates a new user account and returns authentication tokens.
   *
   * @summary Register new user
   */
  @Post('register')
  @SuccessResponse('201', 'User registered successfully')
  @TsoaResponse<ErrorResponse>(409, 'Email already registered or username already taken')
  @TsoaResponse<ErrorResponse>(500, 'Registration failed')
  public async register(
    @Body() requestBody: RegisterRequest,
    @Request() request?: ExpressRequest
  ): Promise<RegisterResponse> {
    try {
      const { email, username, password } = requestBody;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        this.setStatus(409);
        throw new Error('Email already registered');
      }

      // Check if username is taken
      const existingUsername = await UserModel.usernameExists(username);
      if (existingUsername) {
        this.setStatus(409);
        throw new Error('Username already taken');
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

      logger.info('User registered successfully', { userId: user.id, email: user.email, correlationId: request?.headers['x-correlation-id'] || 'unknown' });

      this.setStatus(201);
      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global ?? undefined,
            token_limit_monthly: user.token_limit_monthly ?? undefined,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken
          }
        }
      };
    } catch (error) {
      logger.error('Registration error:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Login user
   *
   * Authenticates user credentials and returns authentication tokens.
   *
   * @summary Login user
   */
  @Post('login')
  @SuccessResponse('200', 'Login successful')
  @TsoaResponse<ErrorResponse>(401, 'Invalid email or password')
  @TsoaResponse<ErrorResponse>(500, 'Login failed')
  public async login(
    @Body() requestBody: LoginRequest,
    @Request() request?: ExpressRequest
  ): Promise<LoginResponse> {
    try {
      const { email, password } = requestBody;

      // Find user with password
      const user = await UserModel.findByEmailWithPassword(email);
      if (!user) {
        this.setStatus(401);
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        this.setStatus(401);
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email, correlationId: request?.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global ?? undefined,
            token_limit_monthly: user.token_limit_monthly ?? undefined,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken
          }
        }
      };
    } catch (error) {
      logger.error('Login error:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   *
   * Generates a new access token using a valid refresh token.
   *
   * @summary Refresh access token
   */
  @Post('refresh')
  @SuccessResponse('200', 'Token refreshed successfully')
  @TsoaResponse<ErrorResponse>(400, 'Refresh token required')
  @TsoaResponse<ErrorResponse>(401, 'Invalid refresh token')
  public async refresh(
    @Body() requestBody: RefreshTokenRequest,
    @Request() request?: ExpressRequest
  ): Promise<RefreshTokenResponse> {
    try {
      const { refresh_token } = requestBody;

      if (!refresh_token) {
        this.setStatus(400);
        throw new Error('Refresh token required');
      }

      const accessToken = await refreshAccessToken(refresh_token);

      return {
        success: true,
        data: {
          access_token: accessToken
        }
      };
    } catch (error) {
      logger.error('Token refresh error:', { error, correlationId: request?.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(401);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user
   *
   * Revokes authentication tokens and logs out the user.
   *
   * @summary Logout user
   */
  @Post('logout')
  @Security('jwt')
  @SuccessResponse('200', 'Logged out successfully')
  @TsoaResponse<ErrorResponse>(500, 'Logout failed')
  public async logout(
    @Body() requestBody: LogoutRequest,
    @Request() request: ExpressRequest
  ): Promise<LogoutResponse> {
    try {
      const authHeader = request.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        await revokeToken(token);
      }

      // Also revoke refresh token if provided
      const { refresh_token } = requestBody;
      if (refresh_token) {
        await revokeToken(refresh_token);
      }

      logger.info('User logged out successfully', { userId: request.user!.id, correlationId: request.headers['x-correlation-id'] || 'unknown' });

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      logger.error('Logout error:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      this.setStatus(500);
      throw new Error('Logout failed');
    }
  }

  /**
   * Get current user (refresh user data)
   *
   * Retrieves the current authenticated user's profile information.
   *
   * @summary Get current user
   */
  @Get('me')
  @Security('jwt')
  @SuccessResponse('200', 'Retrieved successfully')
  @TsoaResponse<ErrorResponse>(404, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to get user data')
  public async getMe(
    @Request() request: ExpressRequest
  ): Promise<GetMeResponse> {
    try {
      const user = await UserModel.findById(request.user!.id);

      if (!user) {
        this.setStatus(404);
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global ?? undefined,
            token_limit_monthly: user.token_limit_monthly ?? undefined,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        }
      };
    } catch (error) {
      logger.error('Error getting current user:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }

  /**
   * Verify token
   *
   * Validates the current authentication token and returns user information.
   *
   * @summary Verify token
   */
  @Get('verify')
  @Security('jwt')
  @SuccessResponse('200', 'Token is valid')
  @TsoaResponse<ErrorResponse>(401, 'User not found')
  @TsoaResponse<ErrorResponse>(500, 'Failed to verify token')
  public async verify(
    @Request() request: ExpressRequest
  ): Promise<VerifyResponse> {
    try {
      // Get fresh user data from database to include role and other fields
      const user = await UserModel.findById(request.user!.id);

      if (!user) {
        this.setStatus(401);
        throw new Error('User not found');
      }

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            token_limit_global: user.token_limit_global ?? undefined,
            token_limit_monthly: user.token_limit_monthly ?? undefined,
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at
          },
          valid: true
        }
      };
    } catch (error) {
      logger.error('Error verifying token:', { error, correlationId: request.headers['x-correlation-id'] || 'unknown' });
      if (!this.getStatus()) {
        this.setStatus(500);
      }
      throw error;
    }
  }
}
