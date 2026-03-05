import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { addBreadcrumb } from '../../analytics/sentry';

const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'access_token', 'refresh_token', 'api_key', 'apikey',
  'password', 'secret', 'authorization', 'key', 'session',
  'credential', 'auth', 'jwt', 'code', 'reset_token',
]);

function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> | undefined {
  const keys = Object.keys(query);
  if (keys.length === 0) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const key of keys) {
    sanitized[key] = SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? '[Filtered]' : query[key];
  }
  return sanitized;
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) return next.handle();

    addBreadcrumb({
      category: 'http',
      message: `${request.method} ${request.path}`,
      level: 'info',
      data: {
        url: request.url,
        method: request.method,
        query: sanitizeQuery(request.query || {}),
      },
    });

    return next.handle();
  }
}
