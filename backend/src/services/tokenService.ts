import { TokenUsageModel } from '../models/TokenUsage';
import logger from '../utils/logger';
import crypto from 'crypto';

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

// Track recently used idempotency keys to prevent duplicates (TTL: 5 minutes)
const recentIdempotencyKeys = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of recentIdempotencyKeys.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      recentIdempotencyKeys.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface TrackUsageResult {
  success: boolean;
  tracked: boolean;
  error?: string;
  isDuplicate?: boolean;
}

export class TokenService {
  /**
   * Generate idempotency key for a request
   * Uses hash of user, conversation, timestamp (rounded to second), and tokens
   */
  static generateIdempotencyKey(params: {
    userId: string;
    conversationId?: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): string {
    const timestamp = Date.now(); // Millisecond precision for uniqueness
    const nonce = crypto.randomBytes(4).toString('hex'); // 8 char random nonce for extra uniqueness
    const data = `${params.userId}:${params.conversationId || 'none'}:${params.provider}:${params.model}:${params.promptTokens}:${params.completionTokens}:${timestamp}:${nonce}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Check if idempotency key was recently used
   */
  static isRecentlyUsed(key: string): boolean {
    return recentIdempotencyKeys.has(key);
  }

  /**
   * Mark idempotency key as used
   */
  static markAsUsed(key: string): void {
    recentIdempotencyKeys.set(key, Date.now());
  }

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
    const modelPricing = providerPricing[model] || providerPricing.default;

    // Calculate cost (pricing is per 1K tokens)
    const promptCost = (promptTokens / 1000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1000) * modelPricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Track token usage for a request with retry logic and idempotency protection
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
    idempotencyKey?: string;
  }): Promise<TrackUsageResult> {
    // Validate input
    if (!params.userId) {
      logger.warn('Token tracking skipped: no userId provided');
      return { success: true, tracked: false, error: 'No userId provided' };
    }

    const totalTokens = params.promptTokens + params.completionTokens;
    if (totalTokens <= 0) {
      logger.warn('Token tracking skipped: no tokens to track');
      return { success: true, tracked: false, error: 'No tokens to track' };
    }

    // Generate or use provided idempotency key
    const idempotencyKey = params.idempotencyKey || this.generateIdempotencyKey({
      userId: params.userId,
      conversationId: params.conversationId,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
    });

    // Check for duplicate request
    if (this.isRecentlyUsed(idempotencyKey)) {
      logger.warn('Token tracking skipped: duplicate request detected', {
        idempotencyKey,
        userId: params.userId,
        provider: params.provider,
      });
      return { success: true, tracked: false, isDuplicate: true };
    }

    const estimatedCost = this.calculateCost(
      params.provider,
      params.model,
      params.promptTokens,
      params.completionTokens
    );

    // Retry logic with exponential backoff
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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

        // Mark as used to prevent duplicates
        this.markAsUsed(idempotencyKey);

        logger.info('Token usage tracked', {
          provider: params.provider,
          model: params.model,
          tokens: totalTokens,
          cost: estimatedCost.toFixed(6),
          attempt
        });

        return { success: true, tracked: true };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 100; // 200ms, 400ms, 800ms
          logger.warn(`Token tracking failed, retrying in ${delayMs}ms`, {
            attempt,
            maxRetries,
            error: lastError.message
          });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    logger.error('Failed to track token usage after all retries:', {
      error: lastError?.message,
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      tokens: totalTokens
    });

    return {
      success: false,
      tracked: false,
      error: lastError?.message || 'Unknown error'
    };
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
   * Estimate tokens for a text with improved accuracy
   * Based on OpenAI's tokenization patterns:
   * - English: ~4 characters per token
   * - Code: ~3.5 characters per token (more symbols)
   * - Other languages: ~2-3 characters per token
   */
  static estimateTokens(text: string): number {
    if (!text) return 0;

    // Count different character types for better estimation
    const codePatterns = /[{}[\]();:=<>!&|+\-*/%^~`@#$\\]/g;
    const codeCharCount = (text.match(codePatterns) || []).length;
    const totalLength = text.length;

    // Estimate code ratio
    const codeRatio = totalLength > 0 ? codeCharCount / totalLength : 0;

    // Adjust characters per token based on content type
    // More code = fewer characters per token (3.5)
    // More text = more characters per token (4.0)
    const charsPerToken = 4.0 - (codeRatio * 0.5);

    return Math.ceil(totalLength / charsPerToken);
  }

  /**
   * Estimate completion tokens based on prompt size
   * Uses dynamic ratios for different prompt lengths:
   * - Short prompts (≤100 tokens): expect concise responses, 1:1 ratio
   * - Medium prompts (100-1000 tokens): moderate response, 0.4 ratio
   * - Large prompts (>1000 tokens): code analysis etc., 0.3 ratio
   */
  private static estimateCompletionTokens(promptTokens: number): number {
    let ratio: number;
    let floor: number;
    let cap: number;

    if (promptTokens <= 100) {
      // Short prompts: expect concise responses
      ratio = 1.0;
      floor = 32;
      cap = 200;
    } else if (promptTokens <= 1000) {
      // Medium prompts: moderate response
      ratio = 0.4;
      floor = 64;
      cap = 1000;
    } else {
      // Large prompts: code analysis, detailed explanations, etc.
      ratio = 0.3;
      floor = 128;
      // Configurable max for large-code analysis scenarios
      cap = Number(process.env.MAX_ESTIMATED_COMPLETION_TOKENS) || 4000;
    }

    return Math.min(cap, Math.max(floor, Math.round(promptTokens * ratio)));
  }

  /**
   * Estimate tokens for messages and files (for pre-request limit checking)
   * Returns a more accurate estimate without doubling
   */
  static estimateRequestTokens(
    messages: Array<{ content: string; role: string }>,
    projectFiles?: string[],
    systemPrompt?: string
  ): { promptTokens: number; estimatedCompletionTokens: number; total: number } {
    let promptTokens = 0;

    // System prompt tokens
    if (systemPrompt) {
      promptTokens += this.estimateTokens(systemPrompt);
    }

    // Message tokens (with overhead for role markers)
    for (const msg of messages) {
      promptTokens += this.estimateTokens(msg.content);
      promptTokens += 4; // Role marker overhead (~4 tokens per message)
    }

    // Project files tokens
    if (projectFiles) {
      for (const file of projectFiles) {
        promptTokens += this.estimateTokens(file);
      }
    }

    // Add formatting overhead (typically 50-100 tokens)
    promptTokens += 50;

    // Estimate completion tokens using dynamic ratio based on prompt size
    const estimatedCompletionTokens = this.estimateCompletionTokens(promptTokens);

    return {
      promptTokens,
      estimatedCompletionTokens,
      total: promptTokens + estimatedCompletionTokens
    };
  }

  /**
   * Get current usage for a user (for limit checking)
   */
  static async getCurrentUsage(userId: string): Promise<{
    totalTokens: number;
    monthlyTokens: number;
    totalCost: number;
    monthlyCost: number;
  }> {
    const summary = await this.getUserSummary(userId);
    const monthlySummary = await this.getUserSummary(
      userId,
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date()
    );

    return {
      totalTokens: summary.total_tokens,
      monthlyTokens: monthlySummary.total_tokens,
      totalCost: summary.total_cost,
      monthlyCost: monthlySummary.total_cost
    };
  }
}
