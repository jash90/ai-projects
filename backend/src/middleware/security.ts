import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'

/**
 * Content Security Policy configuration for markdown rendering
 */
export const contentSecurityPolicy = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline scripts in markdown preview
      'cdn.jsdelivr.net', // For KaTeX and highlight.js
      'cdnjs.cloudflare.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline styles
      'cdn.jsdelivr.net',
      'cdnjs.cloudflare.com',
      'fonts.googleapis.com'
    ],
    fontSrc: [
      "'self'",
      'cdn.jsdelivr.net',
      'fonts.gstatic.com',
      'data:' // For embedded fonts
    ],
    imgSrc: [
      "'self'",
      'data:', // For base64 images
      'blob:', // For blob URLs
      'https:' // For external images in markdown
    ],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"], // Prevent plugins
    childSrc: ["'none'"], // Prevent iframes
    frameAncestors: ["'none'"], // Prevent clickjacking
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: [],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"]
  },
  reportOnly: false // Set to true for testing
})

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

  // Add sandbox attribute for exported HTML
  if (req.path.includes('/export/html')) {
    res.setHeader('Content-Security-Policy', "sandbox allow-same-origin allow-scripts")
  }

  next()
}