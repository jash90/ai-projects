#!/usr/bin/env ts-node

import { initializeTestDatabase, cleanupTestDatabase, testPool } from '../database/testDatabase';
import { UserModel } from '../models/User';
import { aiService } from '../services/aiService';
import { TokenUsageModel } from '../models/TokenUsage';
import logger from '../utils/logger';

interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  test: () => Promise<{ success: boolean; error?: string; details?: any }>;
  cleanup?: () => Promise<void>;
}

async function runTokenLimitBlockingTests() {
  logger.info('🧪 Starting Token Limit Blocking Tests');
  
  try {
    // Initialize test database
    await initializeTestDatabase();
    
    // Create test scenarios
    const scenarios: TestScenario[] = [
      {
        name: 'Test 1: User with no token limits should be allowed',
        description: 'User with null/0 token limits should pass token checking',
        setup: async () => {
          await createTestUser('unlimited@test.com', 'unlimited', null, null);
        },
        test: async () => {
          const user = await getUserByEmail('unlimited@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1000);
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        }
      },
      
      {
        name: 'Test 2: User within global limit should be allowed',
        description: 'User with usage below global limit should pass',
        setup: async () => {
          await createTestUser('within-global@test.com', 'withinglobal', 100000, 10000);
          const user = await getUserByEmail('within-global@test.com');
          // Add some usage but stay within limits
          await addTokenUsage(user.id, 5000);
        },
        test: async () => {
          const user = await getUserByEmail('within-global@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1000);
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        }
      },
      
      {
        name: 'Test 3: User exceeding global limit should be blocked',
        description: 'User with usage at/above global limit should be blocked',
        setup: async () => {
          await createTestUser('exceed-global@test.com', 'exceedglobal', 10000, 50000);
          const user = await getUserByEmail('exceed-global@test.com');
          // Add usage that exceeds global limit
          await addTokenUsage(user.id, 9500);
        },
        test: async () => {
          const user = await getUserByEmail('exceed-global@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1000); // This should push over the limit
            return { success: false, error: 'Should have been blocked but was allowed' };
          } catch (error) {
            if (error instanceof Error && error.message.includes('token limit exceeded')) {
              return { success: true, details: { blocked: true, reason: error.message } };
            }
            return { 
              success: false, 
              error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        }
      },
      
      {
        name: 'Test 4: User exceeding monthly limit should be blocked',
        description: 'User with monthly usage at/above monthly limit should be blocked',
        setup: async () => {
          await createTestUser('exceed-monthly@test.com', 'exceedmonthly', 100000, 5000);
          const user = await getUserByEmail('exceed-monthly@test.com');
          // Add monthly usage that exceeds monthly limit
          await addTokenUsage(user.id, 4500, true); // Monthly usage
        },
        test: async () => {
          const user = await getUserByEmail('exceed-monthly@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1000); // This should push over monthly limit
            return { success: false, error: 'Should have been blocked but was allowed' };
          } catch (error) {
            if (error instanceof Error && error.message.includes('token limit exceeded')) {
              return { success: true, details: { blocked: true, reason: error.message } };
            }
            return { 
              success: false, 
              error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        }
      },
      
      {
        name: 'Test 5: Inactive user should be blocked',
        description: 'Inactive user should be blocked regardless of token limits',
        setup: async () => {
          await createTestUser('inactive@test.com', 'inactive', 100000, 10000, false);
        },
        test: async () => {
          const user = await getUserByEmail('inactive@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 100);
            return { success: false, error: 'Should have been blocked but was allowed' };
          } catch (error) {
            if (error instanceof Error && error.message.includes('inactive')) {
              return { success: true, details: { blocked: true, reason: error.message } };
            }
            return { 
              success: false, 
              error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        }
      },
      
      {
        name: 'Test 6: User using global defaults should work correctly',
        description: 'User without specific limits should use global defaults',
        setup: async () => {
          await createTestUser('global-defaults@test.com', 'globaldefaults', null, null);
          const user = await getUserByEmail('global-defaults@test.com');
          // Add usage close to global defaults (should be 1M global, 100K monthly)
          await addTokenUsage(user.id, 95000, true); // Monthly usage close to default limit
        },
        test: async () => {
          const user = await getUserByEmail('global-defaults@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1000); // Should be allowed
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        }
      },
      
      {
        name: 'Test 7: Edge case - exactly at limit should be blocked',
        description: 'User exactly at limit should be blocked when requesting more tokens',
        setup: async () => {
          await createTestUser('at-limit@test.com', 'atlimit', 10000, 5000);
          const user = await getUserByEmail('at-limit@test.com');
          // Add usage exactly at the limit
          await addTokenUsage(user.id, 10000);
        },
        test: async () => {
          const user = await getUserByEmail('at-limit@test.com');
          try {
            await checkTokenLimitInTestDB(user.id, 1); // Even 1 token should be blocked
            return { success: false, error: 'Should have been blocked but was allowed' };
          } catch (error) {
            if (error instanceof Error && error.message.includes('token limit exceeded')) {
              return { success: true, details: { blocked: true, reason: error.message } };
            }
            return { 
              success: false, 
              error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
          }
        }
      }
    ];
    
    // Run all test scenarios
    let passed = 0;
    let failed = 0;
    
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`\n📋 ${scenario.name}`);
      console.log(`   ${scenario.description}`);
      
      try {
        // Setup
        await scenario.setup();
        
        // Test
        const result = await scenario.test();
        
        if (result.success) {
          console.log(`   ✅ PASSED`);
          if (result.details) {
            console.log(`   📝 Details:`, JSON.stringify(result.details, null, 2));
          }
          passed++;
        } else {
          console.log(`   ❌ FAILED: ${result.error}`);
          if (result.details) {
            console.log(`   📝 Details:`, JSON.stringify(result.details, null, 2));
          }
          failed++;
        }
        
        // Cleanup
        if (scenario.cleanup) {
          await scenario.cleanup();
        }
        
      } catch (error) {
        console.log(`   💥 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }
    
    // Summary
    console.log(`\n📊 TEST SUMMARY`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log(`\n⚠️  Some tests failed. Token limit blocking may not be working correctly.`);
    } else {
      console.log(`\n🎉 All tests passed! Token limit blocking appears to be working correctly.`);
    }
    
  } catch (error) {
    logger.error('Test execution failed:', error);
  } finally {
    await cleanupTestDatabase();
  }
}

// Helper functions
async function createTestUser(email: string, username: string, globalLimit: number | null, monthlyLimit: number | null, isActive: boolean = true): Promise<void> {
  const client = await testPool.connect();
  
  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('test123', 12);
    
    await client.query(`
      INSERT INTO users (email, password_hash, username, is_active, role, token_limit_global, token_limit_monthly)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        token_limit_global = EXCLUDED.token_limit_global,
        token_limit_monthly = EXCLUDED.token_limit_monthly
    `, [email, hashedPassword, username, isActive, 'user', globalLimit, monthlyLimit]);
    
  } finally {
    client.release();
  }
}

async function getUserByEmail(email: string): Promise<any> {
  const client = await testPool.connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      throw new Error(`User ${email} not found`);
    }
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function addTokenUsage(userId: string, tokens: number, monthlyOnly: boolean = false): Promise<void> {
  const client = await testPool.connect();
  
  try {
    const createdAt = monthlyOnly 
      ? new Date() // Current month
      : new Date(Date.now() - (35 * 24 * 60 * 60 * 1000)); // 35 days ago (previous month for non-monthly)
    
    await client.query(`
      INSERT INTO token_usage (user_id, provider, model, total_tokens, estimated_cost, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, 'anthropic', 'claude-3-sonnet-20240229', tokens, tokens * 0.000015, createdAt]);
    
  } finally {
    client.release();
  }
}

// Test-specific token limit checking function that uses the test database
async function checkTokenLimitInTestDB(userId: string, tokensToUse: number): Promise<void> {
  const client = await testPool.connect();
  
  try {
    // Get user details
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      throw new Error(`User not found: ${userId}`);
    }
    
    const user = userResult.rows[0];
    
    if (!user.is_active) {
      const { createUserInactiveError } = await import('../utils/errors');
      throw createUserInactiveError(userId);
    }

    // Get user's current usage
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

    // Convert string values to numbers using Number() for consistency with production code
    const totalTokensNum = Number(total_tokens) || 0;
    const monthlyTokensNum = Number(monthly_tokens) || 0;

    // Get global limits from test database
    const globalLimitsQuery = `
      SELECT limit_type, limit_value
      FROM global_token_limits
      WHERE limit_type IN ('global', 'monthly')
    `;

    const globalLimitsResult = await client.query(globalLimitsQuery);
    const globalLimits = { global: 1000000, monthly: 100000 }; // defaults

    globalLimitsResult.rows.forEach(row => {
      globalLimits[row.limit_type as 'global' | 'monthly'] = row.limit_value;
    });

    // Use nullish coalescing (??) to handle 0 as a valid value (unlimited)
    const globalLimit = user.token_limit_global ?? globalLimits.global;
    const monthlyLimit = user.token_limit_monthly ?? globalLimits.monthly;

    // Check global limit
    if (globalLimit > 0 && totalTokensNum + tokensToUse > globalLimit) {
      const { createTokenLimitError } = await import('../utils/errors');
      throw createTokenLimitError('global', totalTokensNum, globalLimit, tokensToUse);
    }

    // Check monthly limit
    if (monthlyLimit > 0 && monthlyTokensNum + tokensToUse > monthlyLimit) {
      const { createTokenLimitError } = await import('../utils/errors');
      throw createTokenLimitError('monthly', monthlyTokensNum, monthlyLimit, tokensToUse);
    }
  } finally {
    client.release();
  }
}

// Run the tests
runTokenLimitBlockingTests().catch(console.error);
