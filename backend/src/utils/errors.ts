/**
 * Custom error classes for better error handling and categorization
 */

export enum ErrorCode {
  // Token limit errors
  GLOBAL_TOKEN_LIMIT_EXCEEDED = 'GLOBAL_TOKEN_LIMIT_EXCEEDED',
  MONTHLY_TOKEN_LIMIT_EXCEEDED = 'MONTHLY_TOKEN_LIMIT_EXCEEDED',
  TOKEN_LIMIT_EXCEEDED = 'TOKEN_LIMIT_EXCEEDED',
  
  // User errors
  USER_INACTIVE = 'USER_INACTIVE',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // AI service errors
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_MODEL_UNAVAILABLE = 'AI_MODEL_UNAVAILABLE',
  AI_CONTENT_FILTERED = 'AI_CONTENT_FILTERED',
  AI_API_KEY_INVALID = 'AI_API_KEY_INVALID',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode: number;
  metadata?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly metadata?: Record<string, any>;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.userMessage = details.userMessage;
    this.metadata = details.metadata;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      statusCode: this.statusCode,
      metadata: this.metadata,
      stack: this.stack
    };
  }
}

// Token limit specific errors
export class TokenLimitExceededError extends AppError {
  constructor(type: 'global' | 'monthly', currentUsage: number, limit: number, tokensRequested: number) {
    const isGlobal = type === 'global';
    const details: ErrorDetails = {
      code: isGlobal ? ErrorCode.GLOBAL_TOKEN_LIMIT_EXCEEDED : ErrorCode.MONTHLY_TOKEN_LIMIT_EXCEEDED,
      message: `${isGlobal ? 'Global' : 'Monthly'} token limit exceeded: ${currentUsage + tokensRequested}/${limit} tokens`,
      userMessage: isGlobal 
        ? 'Your global token limit has been exceeded. Please contact your administrator or upgrade your plan.'
        : 'Your monthly token limit has been exceeded. Your limit will reset next month.',
      statusCode: 402, // Payment Required - more appropriate for quota/token limits
      metadata: {
        type,
        currentUsage,
        limit,
        tokensRequested,
        remaining: Math.max(0, limit - currentUsage)
      }
    };
    super(details);
  }
}

export class UserInactiveError extends AppError {
  constructor(userId: string) {
    super({
      code: ErrorCode.USER_INACTIVE,
      message: `User ${userId} is inactive`,
      userMessage: 'Your account is inactive. Please contact support to reactivate your account.',
      statusCode: 403,
      metadata: { userId }
    });
  }
}

export class RateLimitExceededError extends AppError {
  constructor(resetTime: Date) {
    super({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait a moment and try again.',
      statusCode: 429,
      metadata: { resetTime: resetTime.toISOString() }
    });
  }
}

export class AIServiceError extends AppError {
  constructor(provider: string, originalError: string) {
    super({
      code: ErrorCode.AI_SERVICE_UNAVAILABLE,
      message: `AI service error (${provider}): ${originalError}`,
      userMessage: 'AI service is temporarily unavailable. Please try again in a moment.',
      statusCode: 503,
      metadata: { provider, originalError }
    });
  }
}

export class ResourceNotFoundError extends AppError {
  constructor(resource: string, id: string) {
    const resourceType = resource.toLowerCase();
    let code: ErrorCode;
    
    switch (resourceType) {
      case 'project':
        code = ErrorCode.PROJECT_NOT_FOUND;
        break;
      case 'agent':
        code = ErrorCode.AGENT_NOT_FOUND;
        break;
      case 'conversation':
        code = ErrorCode.CONVERSATION_NOT_FOUND;
        break;
      default:
        code = ErrorCode.RESOURCE_NOT_FOUND;
    }

    super({
      code,
      message: `${resource} not found: ${id}`,
      userMessage: `The requested ${resourceType} could not be found.`,
      statusCode: 404,
      metadata: { resource, id }
    });
  }
}

// Helper functions for creating common errors
export const createTokenLimitError = (
  type: 'global' | 'monthly',
  currentUsage: number,
  limit: number,
  tokensRequested: number
): TokenLimitExceededError => {
  return new TokenLimitExceededError(type, currentUsage, limit, tokensRequested);
};

export const createUserInactiveError = (userId: string): UserInactiveError => {
  return new UserInactiveError(userId);
};

export const createResourceNotFoundError = (resource: string, id: string): ResourceNotFoundError => {
  return new ResourceNotFoundError(resource, id);
};

export const createAIServiceError = (provider: string, originalError: string): AIServiceError => {
  return new AIServiceError(provider, originalError);
};

export const createRateLimitError = (resetTime: Date): RateLimitExceededError => {
  return new RateLimitExceededError(resetTime);
};

export const createValidationError = (details: {
  message: string;
  userMessage?: string;
  metadata?: Record<string, any>;
}): AppError => {
  return new AppError({
    code: ErrorCode.VALIDATION_ERROR,
    message: details.message,
    userMessage: details.userMessage || 'Invalid input provided',
    statusCode: 400,
    metadata: details.metadata
  });
};

// Error type guard
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};
