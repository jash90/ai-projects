/**
 * Security Audit Logging Middleware
 *
 * Logs security-relevant events for compliance and forensics:
 * - Authentication attempts (success/failure)
 * - Authorization failures
 * - Admin operations
 * - Sensitive data access
 * - Configuration changes
 * - API key usage
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { trackEvent } from '../analytics';

interface AuditLogEntry {
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  statusCode?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Log security audit event
 */
export function logAuditEvent(entry: AuditLogEntry): void {
  // Log to Winston (file storage)
  logger.warn('[AUDIT]', {
    ...entry,
    severity: 'security',
    compliance: 'SOC2',
  });

  // Track in PostHog for analysis
  trackEvent('security_audit', entry.userId || 'anonymous', {
    action: entry.action,
    resource: entry.resource,
    result: entry.result,
    ipAddress: entry.ipAddress,
    path: entry.path,
    method: entry.method,
  });
}

/**
 * Audit middleware - logs all requests to sensitive endpoints
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture response to log result
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;

    // Check if this is a sensitive operation
    const isSensitive = isSensitiveEndpoint(req.path, req.method);

    if (isSensitive || res.statusCode >= 400) {
      const user = (req as any).user;

      logAuditEvent({
        timestamp: new Date().toISOString(),
        userId: user?.id,
        userEmail: user?.email,
        action: getActionName(req.method, req.path),
        resource: getResourceName(req.path),
        result: res.statusCode < 400 ? 'success' : res.statusCode === 403 ? 'denied' : 'failure',
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        errorMessage: res.statusCode >= 400 ? getErrorMessage(data) : undefined,
        metadata: {
          duration,
          query: Object.keys(req.query).length > 0 ? req.query : undefined,
          bodySize: req.get('content-length'),
        },
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Check if endpoint requires audit logging
 */
function isSensitiveEndpoint(path: string, method: string): boolean {
  const sensitivePatterns = [
    // Authentication
    /^\/api\/auth\/(login|register|logout)/,

    // Admin operations
    /^\/api\/admin/,

    // User operations
    /^\/api\/users\/.*\/(role|limits|password)/,

    // API key operations
    /^\/api\/settings\/api-keys/,

    // Sensitive data access
    /^\/api\/users\/.*\/token-usage/,

    // DELETE operations (data deletion)
    method === 'DELETE' && /^\/api\/(projects|agents|files)/,

    // Configuration changes
    method === 'PUT' && /^\/api\/settings/,
  ];

  return sensitivePatterns.some((pattern) => {
    if (typeof pattern === 'boolean') return pattern;
    return pattern.test(path);
  });
}

/**
 * Extract action name from request
 */
function getActionName(method: string, path: string): string {
  if (path.includes('/login')) return 'login_attempt';
  if (path.includes('/register')) return 'registration_attempt';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/admin')) return 'admin_operation';
  if (path.includes('/password')) return 'password_change';
  if (path.includes('/role')) return 'role_change';
  if (path.includes('/limits')) return 'limits_change';

  const actions: Record<string, string> = {
    GET: 'read',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };

  return actions[method] || method.toLowerCase();
}

/**
 * Extract resource name from path
 */
function getResourceName(path: string): string {
  const match = path.match(/\/api\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Extract error message from response data
 */
function getErrorMessage(data: any): string | undefined {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed.error || parsed.message;
    } catch {
      return undefined;
    }
  }
  return data?.error || data?.message;
}

/**
 * Specific audit logging functions for critical operations
 */
export const auditLog = {
  /**
   * Log authentication attempt
   */
  authAttempt: (email: string, success: boolean, ipAddress: string, reason?: string) => {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      userEmail: email,
      action: 'login_attempt',
      resource: 'auth',
      result: success ? 'success' : 'failure',
      ipAddress,
      userAgent: 'N/A',
      method: 'POST',
      path: '/api/auth/login',
      errorMessage: reason,
    });
  },

  /**
   * Log authorization failure
   */
  authorizationDenied: (
    userId: string,
    action: string,
    resource: string,
    ipAddress: string
  ) => {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      result: 'denied',
      ipAddress,
      userAgent: 'N/A',
      method: 'N/A',
      path: 'N/A',
      errorMessage: 'Insufficient permissions',
    });
  },

  /**
   * Log admin operation
   */
  adminOperation: (
    userId: string,
    action: string,
    targetUserId: string,
    changes: Record<string, any>,
    ipAddress: string
  ) => {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      action: `admin_${action}`,
      resource: 'user',
      result: 'success',
      ipAddress,
      userAgent: 'N/A',
      method: 'N/A',
      path: '/api/admin',
      metadata: {
        targetUserId,
        changes,
      },
    });
  },

  /**
   * Log sensitive data access
   */
  sensitiveDataAccess: (
    userId: string,
    dataType: string,
    recordId: string,
    ipAddress: string
  ) => {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      action: 'sensitive_data_access',
      resource: dataType,
      result: 'success',
      ipAddress,
      userAgent: 'N/A',
      method: 'GET',
      path: 'N/A',
      metadata: {
        recordId,
      },
    });
  },

  /**
   * Log API key rotation
   */
  apiKeyRotation: (
    userId: string,
    provider: string,
    ipAddress: string,
    rotationType: 'manual' | 'automatic'
  ) => {
    logAuditEvent({
      timestamp: new Date().toISOString(),
      userId,
      action: 'api_key_rotation',
      resource: 'api_keys',
      result: 'success',
      ipAddress,
      userAgent: 'N/A',
      method: 'PUT',
      path: '/api/settings/api-keys',
      metadata: {
        provider,
        rotationType,
      },
    });
  },
};
