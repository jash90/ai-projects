import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase, closeDatabase } from './database/connection';
import { seedDatabase } from './database/seed';
import { SocketHandler } from './services/socketHandler';
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

const app = express();
const server = createServer(app);

// Configure Socket.IO
const io = new SocketServer(server, {
  cors: {
    origin: config.cors_origin,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize socket handler
const socketHandler = new SocketHandler(io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.cors_origin,
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', projectFileRoutes); // Project file routes include projects/:id/files
app.use('/api', fileRoutes);         // Uploaded file routes
app.use('/api', chatRoutes);         // Chat routes

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message,
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size exceeds limit',
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file upload',
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  });
});

// Initialize database and start server
async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Seed database with initial data
    await seedDatabase();
    logger.info('Database seeded successfully');

    // Start server
    server.listen(config.port, () => {
      logger.info(`Server started on port ${config.port}`, {
        environment: process.env.NODE_ENV,
        port: config.port,
        cors_origin: config.cors_origin,
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