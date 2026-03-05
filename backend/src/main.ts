import 'reflect-metadata';
import './instrument';

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer } from 'http';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { initializeDatabase, closeDatabase } from './database/connection';
import { seedDatabase } from './database/seed';
import { initializeAnalytics, shutdownAnalytics } from './analytics';
import { captureException } from './analytics';
import { flushSentry } from './analytics/sentry';
import logger from './utils/logger';

async function bootstrap() {
  const expressApp = express();
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bodyParser: false,
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);
  const corsOrigin = configService.get<string>('app.corsOrigin', 'http://localhost:3000');
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Initialize analytics (PostHog, Prometheus)
  initializeAnalytics();

  // Parse CORS origins
  const allowedOrigins = corsOrigin.split(',').map((o: string) => o.trim());

  // CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from origin:', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
      'Origin', 'Access-Control-Request-Method', 'Access-Control-Request-Headers',
      'sentry-trace', 'baggage',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Cookie parser
  app.use(cookieParser());

  // Helmet
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...allowedOrigins, "ws:", "wss:"],
      },
    } : false,
  }));

  // Trust proxy in production
  if (nodeEnv === 'production') {
    expressApp.set('trust proxy', 1);
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  if (nodeEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Projects API')
      .setDescription('Backend API for AI Projects Platform')
      .setVersion('2.0')
      .addBearerAuth()
      .addCookieAuth('auth_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Initialize NestJS routes on the Express adapter
  await app.init();

  // Create HTTP server
  const httpServer = createServer(expressApp);

  // Configure server timeouts
  httpServer.timeout = 180000;
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;

  // Start listening immediately for healthcheck (Railway pattern)
  const host = process.env.HOST || '0.0.0.0';
  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      logger.info(`NestJS server started on ${host}:${port} - healthcheck ready, initializing database...`, {
        environment: nodeEnv,
        port,
        host,
        cors_origin: corsOrigin,
      });
      resolve();
    });
  });

  // Initialize database AFTER server is listening (non-blocking for healthcheck)
  try {
    logger.info('Connecting to database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');

    await seedDatabase();
    logger.info('Database seeded successfully');

    logger.info('NestJS server fully ready - database connected');

    // Initialize model service in background
    try {
      const { modelService } = await import('./services/modelService');
      await modelService.initialize();
      logger.info('Model service initialized successfully');
    } catch (err: any) {
      logger.error('Background model sync failed (non-fatal):', err.message);
    }
  } catch (error) {
    logger.error('Database initialization failed (server still running for healthcheck):', error);
  }
}

// Process-level error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  captureException(error, { type: 'uncaughtException' });
  flushSentry(2000).finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', { promise, reason });
  if (reason instanceof Error) {
    captureException(reason, { type: 'unhandledRejection' });
  } else {
    captureException(new Error(String(reason)), { type: 'unhandledRejection', originalReason: reason });
  }
});

bootstrap();
