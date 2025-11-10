import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export function validate(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation failed:', { errors, path: req.path, method: req.method });
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    next();
  };
}

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(255).optional(),
  }),
  
  user: {
    register: Joi.object({
      email: Joi.string().email().required(),
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(6).max(128).required()
        .messages({
          'string.min': 'Password must be at least 6 characters',
          'string.empty': 'Password is required',
          'any.required': 'Password is required'
        }),
    }),
    
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
    
    update: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).optional(),
      password: Joi.string().min(6).max(128).optional()
        .messages({
          'string.min': 'Password must be at least 6 characters'
        }),
    }),
  },

  project: {
    create: Joi.object({
      name: Joi.string().min(1).max(200).required(),
      description: Joi.string().max(1000).optional().allow(''),
    }),
    
    update: Joi.object({
      name: Joi.string().min(1).max(200).optional(),
      description: Joi.string().max(1000).optional().allow(''),
    }),
  },

  message: {
    create: Joi.object({
      content: Joi.string().min(1).max(10000).required(),
      role: Joi.string().valid('user', 'assistant').default('user'),
      metadata: Joi.object().optional(),
    }),
    
    update: Joi.object({
      content: Joi.string().min(1).max(10000).optional(),
      metadata: Joi.object().optional(),
    }),
  },

  agent: {
    create: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().max(500).optional().allow(''),
      system_prompt: Joi.string().min(1).max(10000).required(),
      provider: Joi.string().valid('openai', 'anthropic', 'openrouter').required(),
      model: Joi.string().min(1).max(50).required(),
      temperature: Joi.number().min(0).max(2).default(0.7),
      max_tokens: Joi.number().integer().min(1).max(8000).default(2000),
    }),
    
    update: Joi.object({
      name: Joi.string().min(1).max(100).optional(),
      description: Joi.string().max(500).optional().allow(''),
      system_prompt: Joi.string().min(1).max(10000).optional(),
      provider: Joi.string().valid('openai', 'anthropic', 'openrouter').optional(),
      model: Joi.string().min(1).max(50).optional(),
      temperature: Joi.number().min(0).max(2).optional(),
      max_tokens: Joi.number().integer().min(1).max(8000).optional(),
    }),
  },
};

// File validation middleware
export function validateFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  const file = req.file;
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'text/markdown',
    'application/json',
    'text/javascript', 'application/javascript',
    'text/typescript', 'application/typescript',
    'text/html', 'text/css',
    'text/python', 'application/python',
    'text/java', 'application/java',
    'text/cpp', 'text/c',
    'text/go', 'application/go',
    'text/rust', 'application/rust',
    'text/php', 'application/php',
    'text/ruby', 'application/ruby',
    'text/swift', 'application/swift',
  ];

  // Check file size
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
    });
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'File type not allowed'
    });
  }

  next();
}

// Sanitization helpers
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

// Middleware to sanitize all inputs
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query);
  req.params = sanitizeInput(req.params);
  next();
}