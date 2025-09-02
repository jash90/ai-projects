#!/usr/bin/env ts-node

import { initializeTestDatabase, checkUserAccount, cleanupTestDatabase } from '../database/testDatabase';
import { pool } from '../database/connection';
import { UserModel } from '../models/User';
import logger from '../utils/logger';

async function checkSpecificUser(email: string) {
  logger.info(`Checking user account: ${email}`);
  
  try {
    // First check in main database
    logger.info('=== CHECKING MAIN DATABASE ===');
    const mainResult = await checkUserInMainDatabase(email);
    console.log('Main Database Result:', JSON.stringify(mainResult, null, 2));
    
    // Then check in test database
    logger.info('=== CHECKING TEST DATABASE ===');
    await initializeTestDatabase();
    const testResult = await checkUserAccount(email);
    console.log('Test Database Result:', JSON.stringify(testResult, null, 2));
    
    // Analyze the results
    logger.info('=== ANALYSIS ===');
    analyzeUserAccount(mainResult, testResult);
    
  } catch (error) {
    logger.error('Error checking user:', error);
  } finally {
    await cleanupTestDatabase();
    await pool.end();
  }
}

async function checkUserInMainDatabase(email: string): Promise<any> {
  const client = await pool.connect();
  
  try {
    // Get user details
    const userQuery = `
      SELECT 
        id, email, username, is_active, role, 
        token_limit_global, token_limit_monthly,
        created_at, updated_at
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await client.query(userQuery, [email]);
    
    if (userResult.rowCount === 0) {
      return { error: `User ${email} not found in main database` };
    }
    
    const user = userResult.rows[0];
    
    // Get user's token usage
    const usageQuery = `
      SELECT 
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(CASE 
          WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) 
          THEN total_tokens 
          ELSE 0 
        END), 0) as monthly_tokens,
        COUNT(*) as total_requests,
        MAX(created_at) as last_usage
      FROM token_usage
      WHERE user_id = $1
    `;
    
    const usageResult = await client.query(usageQuery, [user.id]);
    const usage = usageResult.rows[0];
    
    // Get global limits using the User model method
    const globalLimits = await UserModel.getGlobalTokenLimits();
    
    // Get user's projects
    const projectsQuery = `
      SELECT id, name, description
      FROM projects
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    
    const projectsResult = await client.query(projectsQuery, [user.id]);
    const projects = projectsResult.rows;
    
    // Get user's agents
    const agentsQuery = `
      SELECT id, name, provider, model
      FROM agents
      WHERE id IN (
        SELECT DISTINCT agent_id 
        FROM conversations 
        WHERE user_id = $1
      )
      ORDER BY name
    `;
    
    let agents = [];
    try {
      const agentsResult = await client.query(agentsQuery, [user.id]);
      agents = agentsResult.rows;
    } catch (e) {
      // Agents query might fail, ignore
    }
    
    // Check recent errors or failed requests
    const errorQuery = `
      SELECT created_at, error_message, status_code
      FROM request_logs
      WHERE user_id = $1 AND status_code >= 400
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    let recentErrors = [];
    try {
      const errorResult = await client.query(errorQuery, [user.id]);
      recentErrors = errorResult.rows;
    } catch (e) {
      // Table might not exist, ignore
    }
    
    const effectiveGlobalLimit = user.token_limit_global || globalLimits.global;
    const effectiveMonthlyLimit = user.token_limit_monthly || globalLimits.monthly;
    const totalTokens = parseInt(usage.total_tokens);
    const monthlyTokens = parseInt(usage.monthly_tokens);
    
    return {
      user: {
        ...user,
        effective_global_limit: effectiveGlobalLimit,
        effective_monthly_limit: effectiveMonthlyLimit
      },
      usage: {
        total_tokens: totalTokens,
        monthly_tokens: monthlyTokens,
        total_requests: parseInt(usage.total_requests),
        last_usage: usage.last_usage
      },
      global_limits: globalLimits,
      projects: projects,
      agents: agents,
      recent_errors: recentErrors,
      limits_check: {
        global_limit_exceeded: effectiveGlobalLimit > 0 && totalTokens >= effectiveGlobalLimit,
        monthly_limit_exceeded: effectiveMonthlyLimit > 0 && monthlyTokens >= effectiveMonthlyLimit,
        is_active: user.is_active,
        can_send_messages: user.is_active && 
          (effectiveGlobalLimit === null || effectiveGlobalLimit === 0 || totalTokens < effectiveGlobalLimit) &&
          (effectiveMonthlyLimit === null || effectiveMonthlyLimit === 0 || monthlyTokens < effectiveMonthlyLimit)
      }
    };
    
  } catch (error) {
    logger.error('Error checking user in main database:', error);
    throw error;
  } finally {
    client.release();
  }
}

function analyzeUserAccount(mainResult: any, testResult: any) {
  console.log('\n=== USER ACCOUNT ANALYSIS ===');
  
  if (mainResult.error) {
    console.log('❌ User not found in main database');
    console.log('   → User needs to be created or registered');
    return;
  }
  
  const user = mainResult.user;
  const usage = mainResult.usage;
  const limits = mainResult.limits_check;
  
  console.log(`👤 User: ${user.email} (${user.username})`);
  console.log(`📧 ID: ${user.id}`);
  console.log(`🔄 Active: ${user.is_active ? '✅ Yes' : '❌ No'}`);
  console.log(`👑 Role: ${user.role}`);
  console.log('');
  
  console.log('📊 TOKEN LIMITS:');
  console.log(`   Global: ${user.effective_global_limit === null ? 'Unlimited' : user.effective_global_limit.toLocaleString()}`);
  console.log(`   Monthly: ${user.effective_monthly_limit === null ? 'Unlimited' : user.effective_monthly_limit.toLocaleString()}`);
  console.log('');
  
  console.log('📈 CURRENT USAGE:');
  console.log(`   Total Tokens: ${usage.total_tokens.toLocaleString()}`);
  console.log(`   Monthly Tokens: ${usage.monthly_tokens.toLocaleString()}`);
  console.log(`   Total Requests: ${usage.total_requests}`);
  console.log(`   Last Usage: ${usage.last_usage || 'Never'}`);
  console.log('');
  
  console.log('🚦 LIMIT STATUS:');
  console.log(`   Global Limit Exceeded: ${limits.global_limit_exceeded ? '❌ Yes' : '✅ No'}`);
  console.log(`   Monthly Limit Exceeded: ${limits.monthly_limit_exceeded ? '❌ Yes' : '✅ No'}`);
  console.log(`   Can Send Messages: ${limits.can_send_messages ? '✅ Yes' : '❌ No'}`);
  console.log('');
  
  if (mainResult.projects.length > 0) {
    console.log('📁 PROJECTS:');
    mainResult.projects.forEach((project: any) => {
      console.log(`   - ${project.name}`);
    });
  } else {
    console.log('📁 PROJECTS: None found');
  }
  
  if (mainResult.agents && mainResult.agents.length > 0) {
    console.log('🤖 AGENTS:');
    mainResult.agents.forEach((agent: any) => {
      console.log(`   - ${agent.name} (${agent.provider}/${agent.model})`);
    });
  } else {
    console.log('🤖 AGENTS: None found');
  }
  console.log('');
  
  if (mainResult.recent_errors.length > 0) {
    console.log('⚠️  RECENT ERRORS:');
    mainResult.recent_errors.forEach((error: any) => {
      console.log(`   - ${error.created_at}: HTTP ${error.status_code} - ${error.error_message}`);
    });
  } else {
    console.log('⚠️  RECENT ERRORS: None found');
  }
  console.log('');
  
  // Provide recommendations
  console.log('💡 RECOMMENDATIONS:');
  if (!user.is_active) {
    console.log('   ❌ User account is inactive - activate the account');
  }
  if (limits.global_limit_exceeded) {
    console.log('   ❌ Global token limit exceeded - increase limit or reset usage');
  }
  if (limits.monthly_limit_exceeded) {
    console.log('   ❌ Monthly token limit exceeded - wait for next month or increase limit');
  }
  if (mainResult.projects.length === 0) {
    console.log('   ⚠️  No projects found - user needs to create a project first');
  }
  if (limits.can_send_messages) {
    console.log('   ✅ User should be able to send messages - check AI API keys and other issues');
  }
}

// Run the script
const email = process.argv[2] || 'test1234@gmail.com';
checkSpecificUser(email).catch(console.error);
