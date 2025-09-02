#!/usr/bin/env ts-node

import { initializeTestDatabase, cleanupTestDatabase, testPool } from '../database/testDatabase';
import logger from '../utils/logger';

async function debugTokenLimitCalculation() {
  logger.info('🔍 Debugging Token Limit Calculation');
  
  try {
    await initializeTestDatabase();
    
    // Create a test user
    const client = await testPool.connect();
    
    try {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('test123', 12);
      
      const userResult = await client.query(`
        INSERT INTO users (email, password_hash, username, is_active, role, token_limit_global, token_limit_monthly)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, ['debug@test.com', hashedPassword, 'debuguser', true, 'user', 100000, 10000]);
      
      const userId = userResult.rows[0].id;
      console.log('✅ Created test user:', userId);
      
      // Add some token usage
      await client.query(`
        INSERT INTO token_usage (user_id, provider, model, total_tokens, estimated_cost, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, 'anthropic', 'claude-3-sonnet-20240229', 5000, 5000 * 0.000015, new Date()]);
      
      console.log('✅ Added 5000 tokens usage');
      
      // Query the usage
      const usageQuery = `
        SELECT 
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(SUM(CASE 
            WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) 
            THEN total_tokens 
            ELSE 0 
          END), 0) as monthly_tokens
        FROM token_usage
        WHERE user_id = $1
      `;
      
      const usageResult = await client.query(usageQuery, [userId]);
      const { total_tokens, monthly_tokens } = usageResult.rows[0];
      
      console.log('📊 Raw database values:');
      console.log('  total_tokens:', total_tokens, '(type:', typeof total_tokens, ')');
      console.log('  monthly_tokens:', monthly_tokens, '(type:', typeof monthly_tokens, ')');
      
      // Convert to numbers
      const totalTokensNum = parseInt(total_tokens);
      const monthlyTokensNum = parseInt(monthly_tokens);
      
      console.log('📊 Converted values:');
      console.log('  totalTokensNum:', totalTokensNum, '(type:', typeof totalTokensNum, ')');
      console.log('  monthlyTokensNum:', monthlyTokensNum, '(type:', typeof monthlyTokensNum, ')');
      
      // Get user limits
      const user = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      const userData = user.rows[0];
      
      console.log('👤 User limits:');
      console.log('  token_limit_global:', userData.token_limit_global, '(type:', typeof userData.token_limit_global, ')');
      console.log('  token_limit_monthly:', userData.token_limit_monthly, '(type:', typeof userData.token_limit_monthly, ')');
      
      // Get global limits
      const globalLimitsResult = await client.query(`
        SELECT limit_type, limit_value
        FROM global_token_limits
        WHERE limit_type IN ('global', 'monthly')
      `);
      
      console.log('🌍 Global limits from database:');
      globalLimitsResult.rows.forEach(row => {
        console.log(`  ${row.limit_type}:`, row.limit_value, '(type:', typeof row.limit_value, ')');
      });
      
      // Simulate the logic
      const globalLimits = { global: 1000000, monthly: 100000 };
      globalLimitsResult.rows.forEach(row => {
        globalLimits[row.limit_type as 'global' | 'monthly'] = row.limit_value;
      });
      
      const effectiveGlobalLimit = userData.token_limit_global || globalLimits.global;
      const effectiveMonthlyLimit = userData.token_limit_monthly || globalLimits.monthly;
      
      console.log('🎯 Effective limits:');
      console.log('  effectiveGlobalLimit:', effectiveGlobalLimit, '(type:', typeof effectiveGlobalLimit, ')');
      console.log('  effectiveMonthlyLimit:', effectiveMonthlyLimit, '(type:', typeof effectiveMonthlyLimit, ')');
      
      // Test the calculation
      const tokensToUse = 1000;
      const newGlobalTotal = totalTokensNum + tokensToUse;
      const newMonthlyTotal = monthlyTokensNum + tokensToUse;
      
      console.log('🧮 Calculation test:');
      console.log('  tokensToUse:', tokensToUse);
      console.log('  newGlobalTotal:', newGlobalTotal, '(should be 6000)');
      console.log('  newMonthlyTotal:', newMonthlyTotal, '(should be 6000)');
      console.log('  globalLimit exceeded?', effectiveGlobalLimit > 0 && newGlobalTotal > effectiveGlobalLimit);
      console.log('  monthlyLimit exceeded?', effectiveMonthlyLimit > 0 && newMonthlyTotal > effectiveMonthlyLimit);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    logger.error('Debug failed:', error);
  } finally {
    await cleanupTestDatabase();
  }
}

debugTokenLimitCalculation().catch(console.error);
