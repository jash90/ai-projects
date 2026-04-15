/**
 * Utility functions for handling and formatting error messages
 */

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: any;
  metadata?: Record<string, any>;
}

export function formatChatErrorMessage(error: string | ApiError): string {
  let errorText: string;
  let errorCode: string | undefined;
  let metadata: Record<string, any> | undefined;

  // Handle structured API errors
  if (typeof error === 'object' && error.error) {
    errorText = error.error;
    errorCode = error.code;
    metadata = error.metadata;
  } else if (typeof error === 'string') {
    errorText = error;
  } else {
    errorText = 'Unknown error occurred';
  }

  // Handle specific error codes from backend
  if (errorCode) {
    switch (errorCode) {
      case 'GLOBAL_TOKEN_LIMIT_EXCEEDED':
        return `🚫 Global token limit exceeded. ${metadata?.remaining ? `${metadata.remaining} tokens remaining.` : ''} Please contact your administrator or upgrade your plan.`;
      
      case 'MONTHLY_TOKEN_LIMIT_EXCEEDED':
        return `🚫 Monthly token limit exceeded. ${metadata?.remaining ? `${metadata.remaining} tokens remaining.` : ''} Your limit will reset next month.`;
      
      case 'TOKEN_LIMIT_EXCEEDED':
        return '🚫 Token limit exceeded. Please check your usage limits.';
      
      case 'USER_INACTIVE':
        return '🔒 Your account is inactive. Please contact support to reactivate your account.';
      
      case 'RATE_LIMIT_EXCEEDED':
        const resetTime = metadata?.resetTime ? new Date(metadata.resetTime).toLocaleTimeString() : '';
        return `⏱️ Too many requests. Please wait ${resetTime ? `until ${resetTime}` : 'a moment'} and try again.`;
      
      case 'AI_SERVICE_UNAVAILABLE':
        return '🤖 AI service is temporarily unavailable. Please try again in a moment.';
      
      case 'AI_MODEL_UNAVAILABLE':
        return '🤖 AI model temporarily unavailable. Please try a different agent or try again later.';
      
      case 'AGENT_NOT_FOUND':
        return '🔍 The selected AI agent was not found. Please select a different agent.';
      
      case 'PROJECT_NOT_FOUND':
        return '🔍 Project not found. Please check your project access.';
      
      case 'VALIDATION_ERROR':
        return '📝 Invalid input provided. Please check your message and try again.';
      
      case 'AUTHENTICATION_ERROR':
        return '🔐 Authentication expired. Please refresh the page and log in again.';
      
      case 'INSUFFICIENT_PERMISSIONS':
        return '🚫 You don\'t have permission to perform this action.';
    }
  }

  // Fallback to string-based error checking for backward compatibility
  if (errorText.includes('Token limit exceeded')) {
    if (errorText.includes('Global token limit exceeded')) {
      return '🚫 Global token limit exceeded. Please contact your administrator or upgrade your plan.';
    } else if (errorText.includes('Monthly token limit exceeded')) {
      return '🚫 Monthly token limit exceeded. Your limit will reset next month.';
    } else {
      return '🚫 Token limit exceeded. Please check your usage limits.';
    }
  }

  // Rate limiting errors
  if (errorText.includes('rate limit') || errorText.includes('Rate limit')) {
    return '⏱️ Too many requests. Please wait a moment and try again.';
  }

  // Authentication errors
  if (errorText.includes('Unauthorized') || errorText.includes('401')) {
    return '🔐 Authentication expired. Please refresh the page and log in again.';
  }

  // Rate limit errors (HTTP 429)
  if (errorText.includes('HTTP 429') || errorText.includes('Too Many Requests')) {
    return '⏱️ Too many requests. Please wait a moment and try again.';
  }

  // Token limit errors (HTTP 402)
  if (errorText.includes('HTTP 402') || errorText.includes('Payment Required')) {
    if (errorText.includes('global') || errorText.includes('Global')) {
      return '🚫 Global token limit exceeded. Please contact your administrator or upgrade your plan.';
    } else if (errorText.includes('monthly') || errorText.includes('Monthly')) {
      return '🚫 Monthly token limit exceeded. Your limit will reset next month.';
    }
    return '🚫 Token limit exceeded. Please check your usage limits.';
  }

  // Server errors
  if (errorText.includes('HTTP 500') || errorText.includes('Internal Server Error')) {
    return '⚠️ Service temporarily unavailable. Please try again in a moment.';
  }

  // Network errors
  if (errorText.includes('Network Error') || errorText.includes('timeout')) {
    return '🌐 Network connection issue. Please check your connection and try again.';
  }

  // Model availability errors
  if (errorText.includes('model') && errorText.includes('unavailable')) {
    return '🤖 AI model temporarily unavailable. Please try a different agent or try again later.';
  }

  // Content filtering errors
  if (errorText.includes('content policy') || errorText.includes('filtered')) {
    return '🛡️ Message blocked by content policy. Please rephrase your message.';
  }

  // Generic fallback with the original error message
  return errorText;
}

export function shouldShowTokenLimitBanner(error: string): boolean {
  return error.includes('Token limit exceeded') || 
         error.includes('token limit') || 
         error.includes('usage limit');
}

export function extractTokenLimitType(error: string): 'global' | 'monthly' | 'unknown' {
  if (error.includes('Global token limit')) {
    return 'global';
  } else if (error.includes('Monthly token limit') || error.includes('monthly')) {
    return 'monthly';
  }
  return 'unknown';
}
