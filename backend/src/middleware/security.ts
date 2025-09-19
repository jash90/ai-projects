import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import { generateNonce, addNonceToCSP } from '../utils/nonce'

/**
 * Enhanced Content Security Policy with nonce support
 */
export const enhancedCSP = (req: Request, res: Response, next: NextFunction) => {
  // Generate a unique nonce for this request
  const nonce = generateNonce()

  // Store nonce in response locals for use in templates
  res.locals.nonce = nonce

  // Set enhanced CSP header with nonce
  const cspHeader = addNonceToCSP(nonce)
  res.setHeader('Content-Security-Policy', cspHeader)

  next()
}

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // X-Frame-Options
  res.setHeader('X-Frame-Options', 'DENY')

  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )

  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  next()
}

/**
 * Additional markdown-specific security headers
 */
export const markdownSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing for markdown content
  if (req.path.includes('/markdown')) {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
  }

  // Enhanced sandbox for exported HTML with stricter controls
  if (req.path.includes('/export/html')) {
    res.setHeader('Content-Security-Policy', "sandbox allow-same-origin")
    res.setHeader('X-Frame-Options', 'DENY')
  }

  next()
}