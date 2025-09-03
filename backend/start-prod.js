#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting Claude Projects Backend in production...');

// Function to run migrations
function runMigrations() {
  return new Promise((resolve, reject) => {
    console.log('📊 Running database migrations...');
    
    // Use the production migration script
    const migrationScript = path.join(__dirname, 'migrate-prod.js');
    
    exec(`node ${migrationScript}`, (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Migration failed, but continuing with server start...');
        console.log('Error:', error.message);
        if (stderr) console.log('Stderr:', stderr);
        // Don't fail the entire startup if migrations fail
        resolve();
      } else {
        console.log('✅ Database migrations completed');
        if (stdout) console.log(stdout);
        resolve();
      }
    });
  });
}

// Function to start the server
function startServer() {
  console.log('🌐 Starting the server...');
  
  // Ensure PORT is set
  if (!process.env.PORT) {
    console.log('⚠️  PORT environment variable not set, using default 3001');
    process.env.PORT = '3001';
  }
  
  console.log(`🔌 Server will listen on PORT: ${process.env.PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`🚀 CORS Origin: ${process.env.CORS_ORIGIN || 'Default'}`);
  
  // Start the Express server
  try {
    console.log('📂 Loading server from: ./dist/index.js');
    require('./dist/index.js');
    console.log('✅ Server module loaded successfully');
  } catch (error) {
    console.error('💥 Failed to load server module:', error);
    console.error('📁 Current directory:', process.cwd());
    console.error('📂 Directory contents:');
    const fs = require('fs');
    try {
      const files = fs.readdirSync('./dist');
      console.error('dist/ contents:', files);
    } catch (fsError) {
      console.error('Cannot read dist directory:', fsError.message);
    }
    throw error;
  }
}

// Handle process signals gracefully
process.on('SIGTERM', () => {
  console.log('📤 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📤 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Main execution
async function main() {
  try {
    console.log('🔧 Node.js version:', process.version);
    console.log('🔧 Platform:', process.platform);
    console.log('🔧 Architecture:', process.arch);
    
    // Run migrations first (if possible)
    if (process.env.RUN_MIGRATIONS !== 'false') {
      await runMigrations();
    }
    
    // Start the server
    startServer();
    
                 // Test server responsiveness after a short delay
             setTimeout(async () => {
               try {
                 const http = require('http');
                 const port = process.env.PORT || '3001';
                 
                 console.log(`🔍 Testing server responsiveness on port ${port}...`);
                 console.log(`🔍 Using address: 0.0.0.0:${port}`);
                 
                 // Check if port is actually listening
                 const net = require('net');
                 const socket = new net.Socket();
                 
                 socket.setTimeout(2000);
                 socket.on('connect', () => {
                   console.log(`✅ Port ${port} is listening and accepting connections`);
                   socket.destroy();
                 });
                 socket.on('timeout', () => {
                   console.log(`⏰ Port ${port} connection timeout`);
                   socket.destroy();
                 });
                 socket.on('error', (err) => {
                   console.log(`❌ Port ${port} connection error:`, err.message);
                 });
                 
                 socket.connect(port, '0.0.0.0');
        
                         const options = {
                   hostname: '0.0.0.0', // Use 0.0.0.0 for production compatibility
                   port: port,
                   path: '/api/health',
                   method: 'GET',
                   timeout: 5000
                 };
        
        const req = http.request(options, (res) => {
          console.log(`✅ Health check response: ${res.statusCode}`);
          if (res.statusCode === 200) {
            console.log('🎉 Server is responding correctly!');
          } else {
            console.log('⚠️  Server responded but with non-200 status');
          }
        });
        
        req.on('error', (error) => {
          console.error('❌ Health check failed:', error.message);
          console.error('🔧 This might indicate the server is not properly listening');
        });
        
        req.on('timeout', () => {
          console.error('⏰ Health check timed out - server may not be responding');
          req.destroy();
        });
        
        req.end();
      } catch (error) {
        console.error('💥 Error during health check:', error);
      }
                 }, 5000); // Wait 5 seconds for server to fully start
    
    // Keep the process alive
    console.log('✅ Application started successfully');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();
