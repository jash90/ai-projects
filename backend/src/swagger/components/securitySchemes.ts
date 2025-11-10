/**
 * Security Schemes for API Authentication
 * Defines the JWT Bearer authentication mechanism
 */

export const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Enter your JWT token obtained from /api/auth/login endpoint. Format: Bearer <token>',
  },
};

/**
 * Global security requirement
 * Most endpoints require JWT authentication
 */
export const security = [
  {
    bearerAuth: [],
  },
];
