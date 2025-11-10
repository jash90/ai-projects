import { TokenUsageModel } from '../models/TokenUsage';
import logger from '../utils/logger';

// Pricing per 1K tokens (in USD)
// Prices as of 2024 - should be updated regularly or fetched from a config
const MODEL_PRICING = {
  openai: {
    // GPT-4 models
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-4-turbo-preview': { prompt: 0.01, completion: 0.03 },
    'gpt-4-vision-preview': { prompt: 0.01, completion: 0.03 },

    // Custom models (using GPT-4 pricing as estimate)
    'gpt-5': { prompt: 0.04, completion: 0.08 },
    'gpt-5-high': { prompt: 0.05, completion: 0.10 },
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'o3': { prompt: 0.02, completion: 0.04 },
    'o1': { prompt: 0.015, completion: 0.03 },
    'o4-mini': { prompt: 0.0015, completion: 0.002 },

    // GPT-3.5 models
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'gpt-3.5-turbo-16k': { prompt: 0.001, completion: 0.002 },

    // Default for unknown models
    'default': { prompt: 0.01, completion: 0.03 }
  },
  anthropic: {
    // Custom models (as requested by user)
    'claude-opus-4-1-20250805': { prompt: 0.020, completion: 0.080 },
    'claude-opus-4-20250514': { prompt: 0.018, completion: 0.075 },
    'claude-sonnet-4-20250514': { prompt: 0.008, completion: 0.025 },
    'claude-3-7-sonnet-latest': { prompt: 0.005, completion: 0.020 },

    // Real Claude 3 models (for fallback)
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },

    // Claude 2 models
    'claude-2.1': { prompt: 0.008, completion: 0.024 },
    'claude-2.0': { prompt: 0.008, completion: 0.024 },
    'claude-instant-1.2': { prompt: 0.0008, completion: 0.0024 },

    // Default for unknown models
    'default': { prompt: 0.008, completion: 0.024 }
  },
  openrouter: {
    // OpenRouter uses dynamic pricing from the API response
    // These are average estimates for tracking purposes
    'default': { prompt: 0.005, completion: 0.015 }
  }
};

export class TokenService {
  /**
   * Calculate the cost of tokens for a specific model
   */
  static calculateCost(
    provider: 'openai' | 'anthropic' | 'openrouter',
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const providerPricing = MODEL_PRICING[provider];
    const modelPricing = (providerPricing as Record<string, { prompt: number; completion: number }>)[model] || providerPricing.default;
    
    // Calculate cost (pricing is per 1K tokens)
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }

  /**
   * Track token usage for a request
   */
  static async trackUsage(params: {
    userId: string;
    projectId?: string;
    agentId?: string;
    conversationId?: string;
    provider: 'openai' | 'anthropic' | 'openrouter';
    model: string;
    promptTokens: number;
    completionTokens: number;
    requestType?: string;
  }): Promise<void> {
    try {
      const totalTokens = params.promptTokens + params.completionTokens;
      const estimatedCost = this.calculateCost(
        params.provider,
        params.model,
        params.promptTokens,
        params.completionTokens
      );

      await TokenUsageModel.create({
        user_id: params.userId,
        project_id: params.projectId,
        agent_id: params.agentId,
        conversation_id: params.conversationId,
        provider: params.provider,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        total_tokens: totalTokens,
        estimated_cost: estimatedCost,
        request_type: params.requestType
      });

      logger.info('Token usage tracked', {
        provider: params.provider,
        model: params.model,
        tokens: totalTokens,
        cost: estimatedCost.toFixed(6)
      });
    } catch (error) {
      logger.error('Failed to track token usage:', error);
      // Don't throw - we don't want to break the request if tracking fails
    }
  }

  /**
   * Get user's token usage statistics
   */
  static async getUserStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    return TokenUsageModel.getUserStats(userId, startDate, endDate);
  }

  /**
   * Get user's token usage summary
   */
  static async getUserSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    return TokenUsageModel.getUserSummary(userId, startDate, endDate);
  }

  /**
   * Get project's token usage statistics
   */
  static async getProjectStats(projectId: string, userId: string) {
    return TokenUsageModel.getProjectStats(projectId, userId);
  }

  /**
   * Get agent's token usage statistics
   */
  static async getAgentStats(agentId: string, userId: string) {
    return TokenUsageModel.getAgentStats(agentId, userId);
  }

  /**
   * Estimate tokens for a text (rough approximation)
   * OpenAI's rule of thumb: 1 token ≈ 4 characters or 0.75 words
   */
  static estimateTokens(text: string): number {
    // Simple estimation: divide by 4 characters per token
    return Math.ceil(text.length / 4);
  }
}
