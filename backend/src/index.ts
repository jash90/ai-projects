import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase, closeDatabase } from './database/connection';
import { seedDatabase } from './database/seed';
import { SocketHandler } from './services/socketHandler';
import { modelService } from './services/modelService';
import { generalLimiter } from './middleware/rateLimiting';
import { sanitizeInputs } from './middleware/validation';
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

const app: express.Express = express();
const server = createServer(app);

// Parse CORS origins from environment variable (comma-separated)
// Must be defined before Socket.IO and CORS middleware
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? config.cors_origin.split(',').map(origin => origin.trim())
  : [
      config.cors_origin,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001'  // Allow Swagger UI to make requests
    ];

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

// Health check endpoint (before other middleware)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: socketHandler.getConnectedUsersCount(),
  });
});

// ===== TSOA GENERATED ROUTES AND SWAGGER UI =====
// Register tsoa-generated routes
import { RegisterRoutes } from '../build/routes';
RegisterRoutes(app);

// Serve Swagger UI documentation
app.use('/api-docs', swaggerUi.serve, async (_req: express.Request, res: express.Response) => {
  try {
    const swaggerDocument = await import('../build/swagger.json');
    return res.send(swaggerUi.generateHTML(swaggerDocument));
  } catch (error) {
    logger.error('Failed to load Swagger documentation:', error);
    return res.status(503).json({
      success: false,
      error: 'API documentation is not available. Please run `npm run build` first.'
    });
  }
});

logger.info('✅ Swagger UI available at /api-docs');

// ===== LEGACY EXPRESS ROUTES (being migrated to tsoa) =====
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/models', modelRoutes);
app.use('/api', projectFileRoutes); // Project file routes include projects/:id/files
app.use('/api', fileRoutes);         // Uploaded file routes
app.use('/api', chatRoutes);         // Chat routes
app.use('/api', usageRoutes);        // Token usage routes
app.use('/api/admin', adminRoutes);  // Admin routes
app.use('/api/settings', settingsRoutes);  // User settings routes
app.use('/api/debug', debugRoutes);  // Debug routes (development/testing)
app.use('/api/markdown', markdownRoutes); // Markdown routes

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
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Seed database with initial data
    await seedDatabase();
    logger.info('Database seeded successfully');

    // Initialize model service and sync AI models
    await modelService.initialize();
    logger.info('Model service initialized successfully');

    // Configure server timeouts for long AI processing
    server.timeout = 180000; // 3 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds (slightly higher than keepAliveTimeout)

    // Start server
    const PORT = parseInt(process.env.PORT || config.port.toString(), 10);
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server started on port ${PORT}`, {
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
      
      socket.on('disconnect', (reason) => {
        logger.debug('Socket.IO client disconnected', { 
          socketId: socket.id, 
          reason 
        });
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    try {
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
  process.exit(1);
});

// Start the server
startServer();

export { app, server, io, socketHandler };