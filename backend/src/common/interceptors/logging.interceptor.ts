import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import logger from '../../utils/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (!request) return next.handle();

    logger.info(`${request.method} ${request.path}`, {
      ip: request.ip,
      userAgent: request.get?.('User-Agent'),
      userId: request.user?.id,
    });

    return next.handle();
  }
}
