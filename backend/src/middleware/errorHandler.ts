import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError, ErrorCode } from '../utils/errors';
import logger from '../utils/logger';
import { captureException } from '../analytics';

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  metadata?: Record<string, any>;
}

/**
 * Enhanced error handler middleware that provides structured error responses
 * and proper logging for different error types
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const userId = (req as any).user?.id;
  const requestInfo = {
    path: req.path,
    method: req.method,
    userId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  };

  // Handle our custom AppError instances
  if (isAppError(error)) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: error.userMessage,
      code: error.code,
      metadata: error.metadata
    };

    // Log based on error severity
    if (error.statusCode >= 500) {
      logger.error('Application error:', {
        ...requestInfo,
        error: error.toJSON(),
      });

      captureException(error, { userId, path: req.path, method: req.method, errorCode: error.code });

    } else if (error.statusCode >= 400) {
      logger.warn('Client error:', {
        ...requestInfo,
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode
        },
      });
    }

    return res.status(error.statusCode).json(errorResponse);
  }

  // Handle specific error types that aren't AppErrors
  
  // Validation errors (Joi)
  if (error.name === 'ValidationError') {
    logger.warn('Validation error:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid input provided',
      code: ErrorCode.VALIDATION_ERROR,
      details: error.message,
    } as ErrorResponse);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    logger.warn('Authentication error:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
    } as ErrorResponse);
  }

  // Multer file upload errors
  if (error.message?.includes('LIMIT_FILE_SIZE')) {
    logger.warn('File upload error:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(400).json({
      success: false,
      error: 'File size exceeds the maximum allowed limit',
      code: 'FILE_SIZE_EXCEEDED',
    } as ErrorResponse);
  }

  if (error.message?.includes('LIMIT_UNEXPECTED_FILE')) {
    logger.warn('Unexpected file upload:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(400).json({
      success: false,
      error: 'Unexpected file in upload',
      code: 'UNEXPECTED_FILE',
    } as ErrorResponse);
  }

  // Database errors
  if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
    logger.warn('Database constraint violation:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
    } as ErrorResponse);
  }

  // Rate limit errors (from express-rate-limit)
  if (error.message?.includes('Too many requests') || error.message?.includes('rate limit')) {
    logger.warn('Rate limit exceeded:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait a moment and try again.',
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
    } as ErrorResponse);
  }

  // Network/timeout errors
  if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
    logger.error('Request timeout:', {
      ...requestInfo,
      error: error.message,
    });

    return res.status(408).json({
      success: false,
      error: 'Request timeout. Please try again.',
      code: 'REQUEST_TIMEOUT',
    } as ErrorResponse);
  }

  // Default error handling for unhandled errors
  logger.error('Unhandled error:', {
    ...requestInfo,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  captureException(error, { userId, path: req.path, method: req.method, errorType: 'unhandled' });

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    ...(isDevelopment && { details: error.message, stack: error.stack }),
  } as ErrorResponse);
};

/**
 * Async error wrapper to catch async errors and pass them to error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError({
    code: ErrorCode.RESOURCE_NOT_FOUND,
    message: `Route not found: ${req.method} ${req.path}`,
    userMessage: 'The requested resource was not found.',
    statusCode: 404,
    metadata: {
      method: req.method,
      path: req.path,
    },
  });

  next(error);
};
