import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

/**
 * Middleware to log all markdown-related requests
 */
export const logMarkdownRequest = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  const requestId = Math.random().toString(36).substring(7)

  // Log request
  logger.info('Markdown request started', {
    requestId,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })

  // Log request body for POST/PUT requests (excluding sensitive data)
  if (req.method === 'POST' || req.method === 'PUT') {
    const safeBody = { ...req.body }

    // Remove potentially large content fields from logs
    if (safeBody.content && safeBody.content.length > 100) {
      safeBody.content = `[Content truncated: ${safeBody.content.length} chars]`
    }
    if (safeBody.code && safeBody.code.length > 100) {
      safeBody.code = `[Code truncated: ${safeBody.code.length} chars]`
    }

    logger.debug('Request body', {
      requestId,
      body: safeBody
    })
  }

  // Log response
  const originalSend = res.send
  res.send = function(data) {
    const duration = Date.now() - startTime

    logger.info('Markdown request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    })

    // Log errors
    if (res.statusCode >= 400) {
      logger.error('Markdown request failed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        error: data,
        userId: req.user?.id
      })
    }

    // Log slow requests
    if (duration > 3000) {
      logger.warn('Slow markdown request', {
        requestId,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        userId: req.user?.id
      })
    }

    return originalSend.call(this, data)
  }

  next()
}

/**
 * Error logging middleware
 */
export const logMarkdownError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Markdown route error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip
  })

  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred processing your request'
  })
}