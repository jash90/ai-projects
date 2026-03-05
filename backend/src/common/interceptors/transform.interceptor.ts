import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Don't transform if data is null/undefined (streaming responses use @Res())
        if (data === undefined || data === null) return data;
        // Don't double-wrap if already in expected format
        if (typeof data === 'object' && 'success' in data) return data;
        return { success: true, data };
      }),
    );
  }
}
