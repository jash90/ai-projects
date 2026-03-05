import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { AppError, isAppError, ErrorCode } from '../../utils/errors';
import logger from '../../utils/logger';
import { captureException } from '../../analytics';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) return;

    const userId = (request as any).user?.id;
    const requestInfo = {
      path: request.path,
      method: request.method,
      userId,
      ip: request.ip,
    };

    // Handle AppError
    if (isAppError(exception)) {
      if (exception.statusCode >= 500) {
        logger.error('Application error:', { ...requestInfo, error: exception.toJSON() });
        captureException(exception, { userId, path: request.path, method: request.method, errorCode: exception.code });
      } else {
        logger.warn('Client error:', { ...requestInfo, code: exception.code, message: exception.message });
      }

      return response.status(exception.statusCode).json({
        success: false,
        error: exception.userMessage,
        code: exception.code,
        metadata: exception.metadata,
      });
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const message = typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || exception.message
        : exceptionResponse;

      // class-validator returns array of messages
      const errorMessage = Array.isArray(message) ? message.join(', ') : message;

      return response.status(status).json({
        success: false,
        error: errorMessage,
        code: status === 400 ? ErrorCode.VALIDATION_ERROR : undefined,
      });
    }

    // Handle JWT errors
    if (exception instanceof Error) {
      if (exception.name === 'TokenExpiredError') {
        return response.status(401).json({ success: false, error: 'Token expired' });
      }
      if (exception.name === 'JsonWebTokenError') {
        return response.status(401).json({ success: false, error: 'Invalid token' });
      }

      // Multer errors
      if (exception.message?.includes('LIMIT_FILE_SIZE')) {
        return response.status(400).json({ success: false, error: 'File size exceeds the maximum allowed limit', code: 'FILE_SIZE_EXCEEDED' });
      }
      if (exception.message?.includes('LIMIT_UNEXPECTED_FILE')) {
        return response.status(400).json({ success: false, error: 'Unexpected file in upload', code: 'UNEXPECTED_FILE' });
      }

      // Database constraint violations
      if (exception.message?.includes('duplicate key') || exception.message?.includes('unique constraint')) {
        return response.status(409).json({ success: false, error: 'Resource already exists', code: 'DUPLICATE_RESOURCE' });
      }

      // Timeout errors
      if (exception.message?.includes('timeout') || exception.message?.includes('ETIMEDOUT')) {
        return response.status(408).json({ success: false, error: 'Request timeout. Please try again.', code: 'REQUEST_TIMEOUT' });
      }
    }

    // Unknown error
    logger.error('Unhandled error:', { ...requestInfo, error: exception instanceof Error ? { name: (exception as Error).name, message: (exception as Error).message, stack: (exception as Error).stack } : exception });
    if (exception instanceof Error) {
      captureException(exception, { userId, path: request.path, method: request.method, errorType: 'unhandled' });
    }

    const isDevelopment = process.env.NODE_ENV !== 'production';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      ...(isDevelopment && exception instanceof Error && { details: (exception as Error).message }),
    });
  }
}
