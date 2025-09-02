#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Simple logger for production
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

async function runMigrations() {
  let pool;
  
  try {
    // Create database connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    logger.info('Connected to database');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'src/database/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Migrations directory not found: ${migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.info('No migration files found');
      return;
    }

    // Get executed migrations
    const result = await pool.query('SELECT filename FROM migrations');
    const executedMigrations = new Set(result.rows.map(row => row.filename));

    // Run pending migrations
    let migrationsRun = 0;
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        logger.info(`Running migration: ${file}`);
        
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        // Execute migration in a transaction
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
          await client.query('COMMIT');
          logger.info(`Migration completed: ${file}`);
          migrationsRun++;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
    }

    if (migrationsRun === 0) {
      logger.info('All migrations are up to date');
    } else {
      logger.info(`Successfully ran ${migrationsRun} migrations`);
    }

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Only run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`Migration process failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runMigrations };
