#!/usr/bin/env ts-node

import { initializeTestDatabase, cleanupTestDatabase, testPool } from '../database/testDatabase';
import logger from '../utils/logger';

async function inspectTestDatabase() {
  logger.info('🔍 Inspecting Test Database Contents');
  
  try {
    await initializeTestDatabase();
    
    const client = await testPool.connect();
    
    try {
      // Check users
      const usersResult = await client.query('SELECT email, username, token_limit_global, token_limit_monthly FROM users ORDER BY created_at');
      console.log('\n👥 USERS IN TEST DATABASE:');
      if (usersResult.rowCount === 0) {
        console.log('  No users found');
      } else {
        usersResult.rows.forEach((user, i) => {
          console.log(`  ${i + 1}. ${user.email} (${user.username}) - Global: ${user.token_limit_global}, Monthly: ${user.token_limit_monthly}`);
        });
      }
      
      // Check token usage
      const usageResult = await client.query(`
        SELECT 
          u.email,
          tu.total_tokens,
          tu.created_at,
          tu.provider,
          tu.model
        FROM token_usage tu 
        JOIN users u ON tu.user_id = u.id 
        ORDER BY tu.created_at DESC
        LIMIT 20
      `);
      console.log('\n📊 TOKEN USAGE RECORDS:');
      if (usageResult.rowCount === 0) {
        console.log('  No token usage records found');
      } else {
        usageResult.rows.forEach((record, i) => {
          console.log(`  ${i + 1}. ${record.email}: ${record.total_tokens} tokens (${record.created_at.toISOString()}) - ${record.provider}/${record.model}`);
        });
      }
      
      // Check aggregated usage per user
      const aggregatedResult = await client.query(`
        SELECT 
          u.email,
          u.username,
          COALESCE(SUM(tu.total_tokens), 0) as total_tokens,
          COALESCE(SUM(CASE 
            WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
            THEN tu.total_tokens 
            ELSE 0 
          END), 0) as monthly_tokens,
          COUNT(tu.id) as usage_records
        FROM users u
        LEFT JOIN token_usage tu ON u.id = tu.user_id
        GROUP BY u.id, u.email, u.username
        ORDER BY total_tokens DESC
      `);
      
      console.log('\n📈 AGGREGATED USAGE PER USER:');
      if (aggregatedResult.rowCount === 0) {
        console.log('  No users found');
      } else {
        aggregatedResult.rows.forEach((user, i) => {
          console.log(`  ${i + 1}. ${user.email}: Total=${user.total_tokens}, Monthly=${user.monthly_tokens}, Records=${user.usage_records}`);
        });
      }
      
      // Check global limits
      const limitsResult = await client.query('SELECT limit_type, limit_value FROM global_token_limits ORDER BY limit_type');
      console.log('\n🌍 GLOBAL TOKEN LIMITS:');
      if (limitsResult.rowCount === 0) {
        console.log('  No global limits found');
      } else {
        limitsResult.rows.forEach((limit, i) => {
          console.log(`  ${i + 1}. ${limit.limit_type}: ${limit.limit_value}`);
        });
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Inspection failed:', error);
  } finally {
    await cleanupTestDatabase();
  }
}

inspectTestDatabase().catch(console.error);
