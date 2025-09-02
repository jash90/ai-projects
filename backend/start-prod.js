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
  require('./dist/index.js');
}

// Main execution
async function main() {
  try {
    // Run migrations first (if possible)
    if (process.env.RUN_MIGRATIONS !== 'false') {
      await runMigrations();
    }
    
    // Start the server
    startServer();
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

main();
