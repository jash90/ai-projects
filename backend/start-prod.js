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
  
  // Ensure PORT is set for Railway
  if (!process.env.PORT) {
    console.log('⚠️  PORT environment variable not set, using default 3001');
    process.env.PORT = '3001';
  }
  
  console.log(`🔌 Server will listen on PORT: ${process.env.PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start the Express server
  require('./dist/index.js');
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
    
    // Keep the process alive
    console.log('✅ Application started successfully');
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

main();
