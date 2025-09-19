import crypto from 'crypto'

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Add nonce to CSP header
 */
export function addNonceToCSP(nonce: string, existingCSP?: string): string {
  const baseCSP = existingCSP || "default-src 'self'"

  // Enhanced CSP with nonce-based script and style sources
  const enhancedCSP = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' cdn.jsdelivr.net cdnjs.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}' cdn.jsdelivr.net cdnjs.cloudflare.com fonts.googleapis.com`,
    "font-src 'self' cdn.jsdelivr.net fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "child-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "base-uri 'self'"
  ].join('; ')

  return enhancedCSP
}