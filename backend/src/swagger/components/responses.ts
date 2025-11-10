/**
 * Standard API Response Templates
 * Defines common HTTP response formats used across the API
 */

export const responses = {
  Success: {
    description: 'Successful operation',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SuccessResponse',
        },
      },
    },
  },

  Created: {
    description: 'Resource successfully created',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Created resource',
            },
          },
        },
      },
    },
  },

  NoContent: {
    description: 'Successful operation with no content returned',
  },

  BadRequest: {
    description: 'Bad request - Invalid input',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Invalid request parameters',
        },
      },
    },
  },

  Unauthorized: {
    description: 'Unauthorized - Authentication required or token invalid',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Authentication required',
        },
      },
    },
  },

  Forbidden: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Insufficient permissions',
        },
      },
    },
  },

  NotFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Resource not found',
        },
      },
    },
  },

  PaymentRequired: {
    description: 'Payment Required - Token limit exceeded',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Token limit exceeded. Please contact administrator.',
        },
      },
    },
  },

  Conflict: {
    description: 'Conflict - Resource already exists',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Resource already exists',
        },
      },
    },
  },

  TooManyRequests: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        },
      },
    },
    headers: {
      'X-RateLimit-Limit': {
        schema: {
          type: 'integer',
        },
        description: 'Request limit per time window',
      },
      'X-RateLimit-Remaining': {
        schema: {
          type: 'integer',
        },
        description: 'Remaining requests in current window',
      },
      'X-RateLimit-Reset': {
        schema: {
          type: 'integer',
        },
        description: 'Time when rate limit resets (Unix timestamp)',
      },
    },
  },

  ServerError: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        example: {
          success: false,
          error: 'Internal server error',
        },
      },
    },
  },

  ValidationError: {
    description: 'Validation Error - Invalid input data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Validation failed',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
