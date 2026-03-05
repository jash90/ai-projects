import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  private isDatabaseReady = false;

  setDatabaseReady(ready: boolean) {
    this.isDatabaseReady = ready;
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: this.isDatabaseReady ? 'connected' : 'initializing',
      },
    };
  }

  @Public()
  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check' })
  detailed() {
    return {
      success: true,
      data: {
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: this.isDatabaseReady ? 'connected' : 'initializing',
      },
    };
  }
}
