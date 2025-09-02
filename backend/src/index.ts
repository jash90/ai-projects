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

const app: express.Express = express();
const server = createServer(app);

// Configure Socket.IO - Allow access from any origin
const io = new SocketServer(server, {
  cors: {
    origin: true, // Allow all origins
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
});

// Initialize socket handler
const socketHandler = new SocketHandler(io);

// Trust proxy for Railway/production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy (Railway)
}

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

// CORS - Allow access from any origin for Railway deployment
app.use(cors({
  origin: true, // Allow all origins
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

// Serwuj statyczne pliki frontend w produkcji
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');
  
  const frontendDistPath = path.join(__dirname, '../../frontend/dist');
  const indexPath = path.join(frontendDistPath, 'index.html');
  
  console.log('🔍 Checking frontend build...');
  console.log('📂 Frontend dist path:', frontendDistPath);
  console.log('📄 Index.html path:', indexPath);
  console.log('📁 Frontend dist exists:', fs.existsSync(frontendDistPath));
  console.log('📄 Index.html exists:', fs.existsSync(indexPath));
  
  if (fs.existsSync(frontendDistPath)) {
    console.log('✅ Frontend build found, serving static files');
    
    // Serwuj statyczne pliki z frontend build
    app.use(express.static(frontendDistPath));
    
    // Catch-all route dla React Router (przed 404 handler)
    app.get('*', (req, res, next) => {
      // Nie przekierowuj API routes
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next(); // Przejdź do 404 handler
      }
      res.sendFile(indexPath);
    });
  } else {
    console.log('❌ Frontend build not found, serving API only');
  }
}

// 404 handler for unknown routes
app.use(notFoundHandler);

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

    // Start server - Railway automatycznie przypisuje PORT
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