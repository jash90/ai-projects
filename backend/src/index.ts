// Analytics must be imported first for proper Sentry instrumentation
import { initializeAnalytics, shutdownAnalytics, getMetricsHandler, setActiveConnections } from './analytics';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase, closeDatabase } from './database/connection';
import { seedDatabase } from './database/seed';
import { SocketHandler } from './services/socketHandler';
import { modelService } from './services/modelService';
import { generalLimiter } from './middleware/rateLimiting';
import { sanitizeInputs } from './middleware/validation';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { sentryUserContextMiddleware, sentryBreadcrumbMiddleware } from './middleware/sentryMiddleware';
import config from './utils/config';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import agentRoutes from './routes/agents';
import conversationRoutes from './routes/conversations';
import projectFileRoutes from './routes/projectFiles';
import fileRoutes from './routes/files';
import chatRoutes from './routes/chat';
import modelRoutes from './routes/models';
import usageRoutes from './routes/usage';
import adminRoutes from './routes/admin';
import settingsRoutes from './routes/settings';
import debugRoutes from './routes/debug';
import markdownRoutes from './routes/markdown';
import threadRoutes from './routes/threads';
import billingRoutes from './routes/billing';
import { setupSwagger } from './swagger';

const app: express.Express = express();

// Initialize analytics (Sentry, PostHog, Prometheus) - must be early in the app lifecycle
initializeAnalytics(app);

const server = createServer(app);

// Parse CORS origins from environment variable (comma-separated)
// Must be defined before Socket.IO and CORS middleware
const allowedOrigins = config.cors_origin
  .split(',')
  .map(origin => origin.trim());

// Configure Socket.IO with same CORS settings
const io = new SocketServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
});

// Initialize socket handler
const socketHandler = new SocketHandler(io);

// Trust proxy for production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

// CORS - Must be before other middleware for proper header handling
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
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
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false,
}));

// Security middleware - After CORS to allow proper headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins, "ws:", "wss:"],
    },
  } : false, // Disable in development for easier debugging
}));

// Health check endpoint (before other middleware) - responds immediately for Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseReady ? 'connected' : 'initializing'
  });
});

// Track database readiness (declared here for healthcheck access, set in startServer)
let isDatabaseReady = false;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  // Set longer timeout for AI chat endpoints
  if (req.path.includes('/chat')) {
    req.setTimeout(180000); // 3 minutes for AI requests
    res.setTimeout(180000);
  } else {
    req.setTimeout(60000); // 1 minute for other requests
    res.setTimeout(60000);
  }
  next();
});

// Request sanitization
app.use(sanitizeInputs);

// Rate limiting
app.use(generalLimiter);

// Metrics middleware - collect request metrics
app.use(metricsMiddleware);

// Sentry breadcrumb middleware - track request flow
app.use(sentryBreadcrumbMiddleware);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });
  next();
});

// Detailed health check endpoint (for debugging, not used by Railway)
app.get('/api/health/detailed', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: socketHandler.getConnectedUsersCount(),
    database: isDatabaseReady ? 'connected' : 'initializing'
  });
});

// Prometheus metrics endpoint for Grafana Cloud scraping
app.get('/metrics', getMetricsHandler());

// Setup Swagger documentation
setupSwagger(app);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/models', modelRoutes);
app.use('/api', projectFileRoutes); // Project file routes include projects/:id/files
app.use('/api', fileRoutes);         // Uploaded file routes
app.use('/api', chatRoutes);         // Chat routes
app.use('/api/usage', usageRoutes);   // Token usage routes
app.use('/api/admin', adminRoutes);  // Admin routes
app.use('/api/settings', settingsRoutes);  // User settings routes
app.use('/api/debug', debugRoutes);  // Debug routes (development/testing)
app.use('/api/markdown', markdownRoutes); // Markdown routes
app.use('/api/threads', threadRoutes);    // Thread-based chat routes
app.use('/api/billing', billingRoutes);  // Billing & subscription routes

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Import and use the new error handler
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// In production with nginx, we only serve API routes
// nginx handles static files and frontend routing
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Production mode: nginx will serve static files');
  console.log('🔧 Backend will only handle API routes');
} else {
  // In development, serve static files directly
  const path = require('path');
  const fs = require('fs');
  
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  const indexPath = path.join(frontendDistPath, 'index.html');
  
  if (fs.existsSync(frontendDistPath)) {
    console.log('✅ Development mode: serving static files directly');
    
    // Serwuj statyczne pliki z frontend build
    app.use(express.static(frontendDistPath));
    
    // Catch-all route dla React Router
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(indexPath);
    });
  }
  
  // 404 handler for unknown routes (in development)
  app.use(notFoundHandler);
}

// Global error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer(): Promise<void> {
  logger.info('Starting server...', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || config.port,
    databaseUrl: config.database_url ? 'configured' : 'MISSING',
    redisUrl: config.redis_url ? 'configured' : 'MISSING',
  });

  // Configure server timeouts for long AI processing
  server.timeout = 180000; // 3 minutes
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000; // 66 seconds (slightly higher than keepAliveTimeout)

  // START SERVER IMMEDIATELY for Railway healthcheck
  // Database initialization happens after server is listening
  const PORT = parseInt(process.env.PORT || config.port.toString(), 10);
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server started on port ${PORT} - healthcheck ready, initializing database...`, {
      environment: process.env.NODE_ENV,
      port: PORT,
      cors_origin: config.cors_origin,
      timeout: server.timeout,
    });
  });

  // Socket.IO connection logging
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });

  io.on('connection', (socket) => {
    logger.debug('Socket.IO client connected', { socketId: socket.id });
    // Update WebSocket connection metrics
    setActiveConnections('websocket', io.engine.clientsCount);

    socket.on('disconnect', (reason) => {
      logger.debug('Socket.IO client disconnected', {
        socketId: socket.id,
        reason
      });
      // Update WebSocket connection metrics
      setActiveConnections('websocket', io.engine.clientsCount);
    });
  });

  // Initialize database AFTER server is listening (non-blocking for healthcheck)
  try {
    logger.info('Connecting to database...');
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Seed database with initial data
    await seedDatabase();
    logger.info('Database seeded successfully');

    isDatabaseReady = true;
    logger.info('Server fully ready - database connected');

    // Initialize model service and sync AI models in background (non-blocking)
    modelService.initialize()
      .then(() => logger.info('Model service initialized successfully'))
      .catch(err => logger.error('Background model sync failed (non-fatal):', err.message));

  } catch (error) {
    logger.error('Database initialization failed (server still running for healthcheck):', error);
    // Don't exit - keep server running for healthcheck, but API routes will fail gracefully
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');

  server.close(async () => {
    try {
      // Flush analytics events before shutdown
      await shutdownAnalytics();
      await closeDatabase();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');

  server.close(async () => {
    try {
      // Flush analytics events before shutdown
      await shutdownAnalytics();
      await closeDatabase();
      logger.info('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', { promise, reason });
  // Don't call process.exit() - allow server to continue running
  // Background tasks like model sync may fail without crashing the server
});

// Start the server
startServer();

export { app, server, io, socketHandler };