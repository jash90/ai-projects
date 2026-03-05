import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import logger from '../../utils/logger';
import { trackEvent } from '../../analytics';

const SENSITIVE_PATTERNS = [
  /^\/api\/auth\/(login|register|logout)/,
  /^\/api\/admin/,
  /^\/api\/settings/,
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) return next.handle();

    const startTime = Date.now();
    const path = request.path;
    const method = request.method;
    const isSensitive = SENSITIVE_PATTERNS.some((p) => p.test(path)) || method === 'DELETE';

    if (!isSensitive) return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const user = request.user;
          logger.warn('[AUDIT]', {
            timestamp: new Date().toISOString(),
            userId: user?.id,
            action: `${method} ${path}`,
            resource: path.split('/')[2] || 'unknown',
            result: 'success',
            ipAddress: request.ip,
            method,
            path,
            duration,
            severity: 'security',
          });
          trackEvent('security_audit', user?.id || 'anonymous', {
            action: `${method} ${path}`,
            result: 'success',
            duration,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const user = request.user;
          logger.warn('[AUDIT]', {
            timestamp: new Date().toISOString(),
            userId: user?.id,
            action: `${method} ${path}`,
            resource: path.split('/')[2] || 'unknown',
            result: 'failure',
            ipAddress: request.ip,
            method,
            path,
            duration,
            errorMessage: error.message,
            severity: 'security',
          });
        },
      }),
    );
  }
}
