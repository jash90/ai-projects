import { TokenService } from '../../services/tokenService';
import { TokenUsageModel } from '../../models/TokenUsage';

// Mock the TokenUsageModel
jest.mock('../../models/TokenUsage');

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCost', () => {
    it('should calculate cost for OpenAI GPT-4', () => {
      const cost = TokenService.calculateCost('openai', 'gpt-4', 1000, 500);
      // gpt-4: prompt: 0.03/1K, completion: 0.06/1K
      // Expected: (1000/1000 * 0.03) + (500/1000 * 0.06) = 0.03 + 0.03 = 0.06
      expect(cost).toBeCloseTo(0.06, 5);
    });

    it('should calculate cost for OpenAI GPT-3.5-turbo', () => {
      const cost = TokenService.calculateCost('openai', 'gpt-3.5-turbo', 1000, 500);
      // gpt-3.5-turbo: prompt: 0.0005/1K, completion: 0.0015/1K
      // Expected: (1000/1000 * 0.0005) + (500/1000 * 0.0015) = 0.0005 + 0.00075 = 0.00125
      expect(cost).toBeCloseTo(0.00125, 6);
    });

    it('should calculate cost for Anthropic Claude 3 Sonnet', () => {
      const cost = TokenService.calculateCost('anthropic', 'claude-3-sonnet-20240229', 1000, 500);
      // claude-3-sonnet: prompt: 0.003/1K, completion: 0.015/1K
      // Expected: (1000/1000 * 0.003) + (500/1000 * 0.015) = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 5);
    });

    it('should use default pricing for unknown models', () => {
      const cost = TokenService.calculateCost('openai', 'unknown-model', 1000, 500);
      // default: prompt: 0.01/1K, completion: 0.03/1K
      // Expected: (1000/1000 * 0.01) + (500/1000 * 0.03) = 0.01 + 0.015 = 0.025
      expect(cost).toBeCloseTo(0.025, 5);
    });

    it('should handle zero tokens', () => {
      const cost = TokenService.calculateCost('openai', 'gpt-4', 0, 0);
      expect(cost).toBe(0);
    });

    it('should handle very large token counts', () => {
      const cost = TokenService.calculateCost('openai', 'gpt-4', 1000000, 500000);
      // gpt-4: prompt: 0.03/1K, completion: 0.06/1K
      // Expected: (1000000/1000 * 0.03) + (500000/1000 * 0.06) = 30 + 30 = 60
      expect(cost).toBeCloseTo(60, 2);
    });
  });

  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(TokenService.estimateTokens('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(TokenService.estimateTokens(null as any)).toBe(0);
      expect(TokenService.estimateTokens(undefined as any)).toBe(0);
    });

    it('should estimate tokens for plain English text', () => {
      // Average English text: ~4 chars per token
      const text = 'This is a simple test sentence for token estimation.';
      const estimate = TokenService.estimateTokens(text);
      // 52 characters / ~4 = ~13 tokens
      expect(estimate).toBeGreaterThan(10);
      expect(estimate).toBeLessThan(20);
    });

    it('should estimate higher for code-like content', () => {
      // Code has more special characters, fewer chars per token
      const code = 'function test() { return x + y * 2; }';
      const estimate = TokenService.estimateTokens(code);
      // Code uses ~3.5 chars per token due to symbols
      expect(estimate).toBeGreaterThan(8);
    });

    it('should handle very long text', () => {
      const longText = 'word '.repeat(10000); // 50,000 characters
      const estimate = TokenService.estimateTokens(longText);
      // Should estimate around 12,500 tokens (50000/4)
      expect(estimate).toBeGreaterThan(10000);
      expect(estimate).toBeLessThan(20000);
    });
  });

  describe('estimateRequestTokens', () => {
    it('should estimate tokens for simple messages', () => {
      const messages = [{ role: 'user', content: 'Hello, how are you?' }];
      const result = TokenService.estimateRequestTokens(messages);

      expect(result.promptTokens).toBeGreaterThan(0);
      expect(result.estimatedCompletionTokens).toBeGreaterThan(0);
      expect(result.total).toBe(result.promptTokens + result.estimatedCompletionTokens);
    });

    it('should include system prompt in estimation', () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant.';

      const withoutSystem = TokenService.estimateRequestTokens(messages);
      const withSystem = TokenService.estimateRequestTokens(messages, undefined, systemPrompt);

      expect(withSystem.promptTokens).toBeGreaterThan(withoutSystem.promptTokens);
    });

    it('should include project files in estimation', () => {
      const messages = [{ role: 'user', content: 'Analyze this code' }];
      const projectFiles = ['const x = 1;', 'function test() {}'];

      const withoutFiles = TokenService.estimateRequestTokens(messages);
      const withFiles = TokenService.estimateRequestTokens(messages, projectFiles);

      expect(withFiles.promptTokens).toBeGreaterThan(withoutFiles.promptTokens);
    });

    it('should handle multiple messages', () => {
      const messages = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ];
      const result = TokenService.estimateRequestTokens(messages);

      // Should account for all messages plus overhead per message
      expect(result.promptTokens).toBeGreaterThan(20);
    });

    it('should use dynamic estimation for short prompts (≤100 tokens)', () => {
      // Short prompt: "Hello" is ~2 tokens + overhead
      const messages = [{ role: 'user', content: 'Hello' }];
      const result = TokenService.estimateRequestTokens(messages);

      // For short prompts (≤100 tokens): floor=32, cap=200, ratio=1.0
      expect(result.estimatedCompletionTokens).toBeGreaterThanOrEqual(32);
      expect(result.estimatedCompletionTokens).toBeLessThanOrEqual(200);
    });

    it('should use dynamic estimation for medium prompts (100-1000 tokens)', () => {
      // Medium prompt: ~200 tokens worth of content
      const messages = [{ role: 'user', content: 'x '.repeat(400) }]; // ~200 tokens
      const result = TokenService.estimateRequestTokens(messages);

      // For medium prompts (100-1000): floor=64, cap=1000, ratio=0.4
      expect(result.estimatedCompletionTokens).toBeGreaterThanOrEqual(64);
      expect(result.estimatedCompletionTokens).toBeLessThanOrEqual(1000);
    });

    it('should use dynamic estimation for large prompts (>1000 tokens)', () => {
      // Large prompt: ~2000 tokens worth of content
      const messages = [{ role: 'user', content: 'word '.repeat(4000) }]; // ~2000 tokens
      const result = TokenService.estimateRequestTokens(messages);

      // For large prompts (>1000): floor=128, ratio=0.3, cap=4000 (default)
      expect(result.estimatedCompletionTokens).toBeGreaterThanOrEqual(128);
      expect(result.estimatedCompletionTokens).toBeLessThanOrEqual(4000);
    });

    it('should not force 500 tokens minimum for tiny prompts', () => {
      // Very short prompt should NOT get forced to 500 tokens anymore
      const messages = [{ role: 'user', content: 'Hi' }];
      const result = TokenService.estimateRequestTokens(messages);

      // Old behavior was minimum 500 - now it should be much less for short prompts
      expect(result.estimatedCompletionTokens).toBeLessThan(500);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should generate unique keys for each call (includes random nonce)', () => {
      const params = {
        userId: 'user-123',
        conversationId: 'conv-456',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      };

      // With the random nonce, each call should generate a unique key
      // This prevents collisions when same params are used in quick succession
      const key1 = TokenService.generateIdempotencyKey(params);
      const key2 = TokenService.generateIdempotencyKey(params);

      // Keys should be different due to random nonce
      expect(key1).not.toBe(key2);
      expect(key1).toHaveLength(32);
      expect(key2).toHaveLength(32);
    });

    it('should generate different keys for different users', () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now());

      const key1 = TokenService.generateIdempotencyKey({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      const key2 = TokenService.generateIdempotencyKey({
        userId: 'user-456',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(key1).not.toBe(key2);

      jest.restoreAllMocks();
    });

    it('should handle missing conversationId', () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.now());

      const key = TokenService.generateIdempotencyKey({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(key).toHaveLength(32);

      jest.restoreAllMocks();
    });
  });

  describe('isRecentlyUsed and markAsUsed', () => {
    it('should return false for unused keys', () => {
      const key = 'unused-key-' + Date.now();
      expect(TokenService.isRecentlyUsed(key)).toBe(false);
    });

    it('should return true after marking key as used', () => {
      const key = 'test-key-' + Date.now();

      expect(TokenService.isRecentlyUsed(key)).toBe(false);
      TokenService.markAsUsed(key);
      expect(TokenService.isRecentlyUsed(key)).toBe(true);
    });
  });

  describe('trackUsage', () => {
    beforeEach(() => {
      (TokenUsageModel.create as jest.Mock).mockResolvedValue({
        id: 'test-usage-id',
        user_id: 'user-123',
        total_tokens: 150,
      });
    });

    it('should track usage successfully', async () => {
      const result = await TokenService.trackUsage({
        userId: 'user-123',
        projectId: 'project-456',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(true);
      expect(TokenUsageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          project_id: 'project-456',
          provider: 'openai',
          model: 'gpt-4',
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        })
      );
    });

    it('should skip tracking when no userId provided', async () => {
      const result = await TokenService.trackUsage({
        userId: '',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(false);
      expect(result.error).toBe('No userId provided');
      expect(TokenUsageModel.create).not.toHaveBeenCalled();
    });

    it('should skip tracking when no tokens to track', async () => {
      const result = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 0,
        completionTokens: 0,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(false);
      expect(result.error).toBe('No tokens to track');
      expect(TokenUsageModel.create).not.toHaveBeenCalled();
    });

    it('should detect and skip duplicate requests', async () => {
      // First call should succeed
      const result1 = await TokenService.trackUsage({
        userId: 'user-dup-test',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        idempotencyKey: 'unique-key-for-duplicate-test',
      });

      expect(result1.success).toBe(true);
      expect(result1.tracked).toBe(true);

      // Second call with same idempotency key should be detected as duplicate
      const result2 = await TokenService.trackUsage({
        userId: 'user-dup-test',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        idempotencyKey: 'unique-key-for-duplicate-test',
      });

      expect(result2.success).toBe(true);
      expect(result2.tracked).toBe(false);
      expect(result2.isDuplicate).toBe(true);

      // TokenUsageModel.create should only be called once
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed eventually', async () => {
      (TokenUsageModel.create as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ id: 'test-usage-id' });

      const result = await TokenService.trackUsage({
        userId: 'user-retry-test',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(true);
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(2);
    });

    it('should fail after all retries exhausted', async () => {
      (TokenUsageModel.create as jest.Mock)
        .mockRejectedValue(new Error('Persistent failure'));

      const result = await TokenService.trackUsage({
        userId: 'user-fail-test',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(result.success).toBe(false);
      expect(result.tracked).toBe(false);
      expect(result.error).toBe('Persistent failure');
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(3); // maxRetries = 3
    }, 15000); // Increased timeout for retry delays

    it('should calculate cost correctly when tracking', async () => {
      await TokenService.trackUsage({
        userId: 'user-cost-test',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 1000,
        completionTokens: 500,
      });

      expect(TokenUsageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // gpt-4: prompt: 0.03/1K, completion: 0.06/1K
          // Expected: 0.03 + 0.03 = 0.06
          estimated_cost: expect.closeTo(0.06, 2),
        })
      );
    });

    it('should include optional fields when provided', async () => {
      await TokenService.trackUsage({
        userId: 'user-123',
        projectId: 'project-456',
        agentId: 'agent-789',
        conversationId: 'conv-012',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        promptTokens: 100,
        completionTokens: 50,
        requestType: 'chat_stream',
      });

      expect(TokenUsageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          project_id: 'project-456',
          agent_id: 'agent-789',
          conversation_id: 'conv-012',
          provider: 'anthropic',
          model: 'claude-3-sonnet-20240229',
          request_type: 'chat_stream',
        })
      );
    });
  });
});

// Custom matcher for closeTo
expect.extend({
  closeTo(received: number, expected: number, precision: number = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision);
    if (pass) {
      return {
        message: () => `expected ${received} not to be close to ${expected}`,
        pass: true,
      };
    }
    return {
      message: () => `expected ${received} to be close to ${expected}`,
      pass: false,
    };
  },
});
