import { Injectable } from '@nestjs/common';
import { trackEvent, captureException, getMetricsHandler } from './index';

@Injectable()
export class AnalyticsService {
  trackEvent(event: string, userId: string, properties?: Record<string, any>) {
    trackEvent(event, userId, properties);
  }

  captureException(error: Error, context?: Record<string, any>) {
    captureException(error, context);
  }

  getMetricsHandler() {
    return getMetricsHandler();
  }
}
