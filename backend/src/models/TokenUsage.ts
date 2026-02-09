import { pool } from '../database/connection';

export interface TokenUsage {
  id: string;
  user_id: string;
  project_id?: string;
  agent_id?: string;
  conversation_id?: string;
  provider: 'openai' | 'anthropic' | 'openrouter';
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  request_type?: string;
  created_at: string;
}

export interface TokenUsageStats {
  provider: string;
  model: string;
  usage_date: string;
  request_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens_used: number;
  total_cost: number;
}

export interface TokenUsageSummary {
  total_tokens: number;
  total_cost: number;
  prompt_tokens: number;
  completion_tokens: number;
  by_provider: {
    [provider: string]: {
      tokens: number;
      cost: number;
      prompt_tokens: number;
      completion_tokens: number;
      models: {
        [model: string]: {
          tokens: number;
          cost: number;
          requests: number;
          prompt_tokens: number;
          completion_tokens: number;
        };
      };
    };
  };
}

export class TokenUsageModel {
  static async create(usage: Omit<TokenUsage, 'id' | 'created_at'>): Promise<TokenUsage> {
    const query = `
      INSERT INTO token_usage (
        user_id, project_id, agent_id, conversation_id, provider, model,
        prompt_tokens, completion_tokens, total_tokens, estimated_cost, request_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      usage.user_id,
      usage.project_id || null,
      usage.agent_id || null,
      usage.conversation_id || null,
      usage.provider,
      usage.model,
      usage.prompt_tokens,
      usage.completion_tokens,
      usage.total_tokens,
      usage.estimated_cost,
      usage.request_type || null
    ]);

    return result.rows[0];
  }

  static async getUserStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TokenUsageStats[]> {
    let query = `
      SELECT 
        provider,
        model,
        DATE_TRUNC('day', created_at) as usage_date,
        COUNT(*) as request_count,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens_used,
        SUM(estimated_cost) as total_cost
      FROM token_usage
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += `
      GROUP BY provider, model, DATE_TRUNC('day', created_at)
      ORDER BY usage_date DESC, provider, model
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getProjectStats(
    projectId: string,
    userId: string
  ): Promise<TokenUsageStats[]> {
    const query = `
      SELECT 
        provider,
        model,
        DATE_TRUNC('day', created_at) as usage_date,
        COUNT(*) as request_count,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens_used,
        SUM(estimated_cost) as total_cost
      FROM token_usage
      WHERE project_id = $1 AND user_id = $2
      GROUP BY provider, model, DATE_TRUNC('day', created_at)
      ORDER BY usage_date DESC, provider, model
    `;

    const result = await pool.query(query, [projectId, userId]);
    return result.rows;
  }

  static async getUserSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TokenUsageSummary> {
    let query = `
      SELECT
        provider,
        model,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(estimated_cost) as total_cost
      FROM token_usage
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY provider, model`;

    const result = await pool.query(query, params);

    const summary: TokenUsageSummary = {
      total_tokens: 0,
      total_cost: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      by_provider: {}
    };

    for (const row of result.rows) {
      const tokens = parseInt(row.total_tokens);
      const cost = parseFloat(row.total_cost);
      const pTokens = parseInt(row.total_prompt_tokens) || 0;
      const cTokens = parseInt(row.total_completion_tokens) || 0;

      summary.total_tokens += tokens;
      summary.total_cost += cost;
      summary.prompt_tokens += pTokens;
      summary.completion_tokens += cTokens;

      if (!summary.by_provider[row.provider]) {
        summary.by_provider[row.provider] = {
          tokens: 0,
          cost: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          models: {}
        };
      }

      summary.by_provider[row.provider].tokens += tokens;
      summary.by_provider[row.provider].cost += cost;
      summary.by_provider[row.provider].prompt_tokens += pTokens;
      summary.by_provider[row.provider].completion_tokens += cTokens;

      summary.by_provider[row.provider].models[row.model] = {
        tokens,
        cost,
        requests: parseInt(row.request_count),
        prompt_tokens: pTokens,
        completion_tokens: cTokens
      };
    }

    return summary;
  }

  static async getThreadStats(
    threadId: string,
    userId: string
  ): Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost: number;
    request_count: number;
  }> {
    const query = `
      SELECT
        COALESCE(SUM(prompt_tokens), 0)::int as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0)::int as completion_tokens,
        COALESCE(SUM(total_tokens), 0)::int as total_tokens,
        COALESCE(SUM(estimated_cost), 0)::numeric as total_cost,
        COUNT(*)::int as request_count
      FROM token_usage
      WHERE conversation_id = $1 AND user_id = $2
    `;

    const result = await pool.query(query, [threadId, userId]);
    const row = result.rows[0];
    return {
      total_tokens: parseInt(row.total_tokens) || 0,
      prompt_tokens: parseInt(row.prompt_tokens) || 0,
      completion_tokens: parseInt(row.completion_tokens) || 0,
      total_cost: parseFloat(row.total_cost) || 0,
      request_count: parseInt(row.request_count) || 0,
    };
  }

  static async getAgentStats(
    agentId: string,
    userId: string
  ): Promise<TokenUsageStats[]> {
    const query = `
      SELECT 
        provider,
        model,
        DATE_TRUNC('day', created_at) as usage_date,
        COUNT(*) as request_count,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens_used,
        SUM(estimated_cost) as total_cost
      FROM token_usage
      WHERE agent_id = $1 AND user_id = $2
      GROUP BY provider, model, DATE_TRUNC('day', created_at)
      ORDER BY usage_date DESC, provider, model
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows;
  }
}
