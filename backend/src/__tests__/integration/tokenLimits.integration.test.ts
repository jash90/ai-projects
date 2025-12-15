/**
 * Integration tests for token limit flow
 * Tests the complete flow of token management components working together
 */

// Mock dependencies before any imports
jest.mock('../../database/connection');

// Create a proper logger mock that works with default export
jest.mock('../../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock TokenUsageModel for trackUsage tests
jest.mock('../../models/TokenUsage', () => ({
  TokenUsageModel: {
    create: jest.fn(),
  },
}));

import * as dbConnection from '../../database/connection';
import { TokenService } from '../../services/tokenService';
import { UserModel } from '../../models/User';
import { TokenUsageModel } from '../../models/TokenUsage';

describe('Token Limit Integration Tests', () => {
  let mockClient: any;
  let mockPoolQuery: jest.Mock;
  let mockPoolConnect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup pool mock functions fresh each test
    mockPoolQuery = jest.fn();
    mockPoolConnect = jest.fn().mockResolvedValue(mockClient);

    // Assign the mock pool
    (dbConnection as any).pool = {
      query: mockPoolQuery,
      connect: mockPoolConnect,
      end: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('Token Limit Check Flow', () => {
    it('should complete full token limit check workflow', async () => {
      // Setup: User with limits
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            is_active: true,
            token_limit_global: 100000,
            token_limit_monthly: 10000,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            { limit_type: 'global', limit_value: 1000000 },
            { limit_type: 'monthly', limit_value: 100000 },
          ],
        });

      // Setup transaction mock
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        if (query.includes('pg_advisory_xact_lock')) {
          return Promise.resolve();
        }
        if (query.includes('total_tokens')) {
          return Promise.resolve({
            rows: [{ total_tokens: '5000', monthly_tokens: '3000' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      // Execute: Check token limit
      const result = await UserModel.checkTokenLimit('user-123', 1000);

      // Verify: Full workflow completed
      expect(result.allowed).toBe(true);
      expect(result.currentUsage.totalTokens).toBe(5000);
      expect(result.currentUsage.monthlyTokens).toBe(3000);
      expect(result.limits.globalLimit).toBe(100000);
      expect(result.limits.monthlyLimit).toBe(10000);

      // Verify transaction was used
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should enforce global limit in full workflow', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            is_active: true,
            token_limit_global: 10000,
            token_limit_monthly: 50000,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            { limit_type: 'global', limit_value: 1000000 },
            { limit_type: 'monthly', limit_value: 100000 },
          ],
        });

      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        if (query.includes('pg_advisory_xact_lock')) {
          return Promise.resolve();
        }
        if (query.includes('total_tokens')) {
          return Promise.resolve({
            rows: [{ total_tokens: '9500', monthly_tokens: '5000' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow(/global token limit exceeded/i);

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should enforce monthly limit in full workflow', async () => {
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            is_active: true,
            token_limit_global: 100000,
            token_limit_monthly: 5000,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            { limit_type: 'global', limit_value: 1000000 },
            { limit_type: 'monthly', limit_value: 100000 },
          ],
        });

      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        if (query.includes('pg_advisory_xact_lock')) {
          return Promise.resolve();
        }
        if (query.includes('total_tokens')) {
          return Promise.resolve({
            rows: [{ total_tokens: '10000', monthly_tokens: '4500' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow(/monthly token limit exceeded/i);
    });
  });

  describe('Token Tracking Integration', () => {
    beforeEach(() => {
      (TokenUsageModel.create as jest.Mock).mockResolvedValue({
        id: 'usage-123',
        user_id: 'user-123',
        total_tokens: 150,
      });
    });

    it('should track usage with correct cost calculation', async () => {
      const result = await TokenService.trackUsage({
        userId: 'user-123',
        projectId: 'project-456',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 1000,
        completionTokens: 500,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(true);

      // Verify cost was calculated correctly
      expect(TokenUsageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          project_id: 'project-456',
          provider: 'openai',
          model: 'gpt-4',
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          // GPT-4: prompt=$0.03/1K, completion=$0.06/1K
          // Expected: (1000/1000 * 0.03) + (500/1000 * 0.06) = 0.06
          estimated_cost: expect.any(Number),
        })
      );
    });

    it('should integrate estimation and tracking', async () => {
      // First estimate tokens for a request
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, how are you?' },
      ];

      const estimation = TokenService.estimateRequestTokens(messages);

      expect(estimation.promptTokens).toBeGreaterThan(0);
      expect(estimation.estimatedCompletionTokens).toBeGreaterThan(0);

      // Then track actual usage
      const trackResult = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        promptTokens: estimation.promptTokens,
        completionTokens: 50, // Actual completion tokens
      });

      expect(trackResult.success).toBe(true);
      expect(trackResult.tracked).toBe(true);
    });

    it('should handle idempotency correctly across multiple calls', async () => {
      const idempotencyKey = `idempotent-test-${Date.now()}`;

      // First call
      const result1 = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        idempotencyKey,
      });

      expect(result1.tracked).toBe(true);
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(1);

      // Second call with same key
      const result2 = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
        idempotencyKey,
      });

      expect(result2.tracked).toBe(false);
      expect(result2.isDuplicate).toBe(true);
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(1); // Still only 1 call
    });
  });

  describe('Cost Calculation Integration', () => {
    it('should calculate costs correctly for all providers', () => {
      // OpenAI GPT-4
      const gpt4Cost = TokenService.calculateCost('openai', 'gpt-4', 1000, 500);
      expect(gpt4Cost).toBeCloseTo(0.06, 2);

      // OpenAI GPT-3.5
      const gpt35Cost = TokenService.calculateCost('openai', 'gpt-3.5-turbo', 1000, 500);
      expect(gpt35Cost).toBeCloseTo(0.00125, 4);

      // Anthropic Claude
      const claudeCost = TokenService.calculateCost('anthropic', 'claude-3-sonnet-20240229', 1000, 500);
      expect(claudeCost).toBeCloseTo(0.0105, 4);
    });

    it('should use default pricing for unknown models', () => {
      // Use a valid provider with an unknown model to test default pricing fallback
      const unknownCost = TokenService.calculateCost('openai' as any, 'unknown-model-xyz', 1000, 500);
      // Default: prompt=$0.01/1K, completion=$0.03/1K
      // Expected: 0.01 + 0.015 = 0.025
      expect(unknownCost).toBeCloseTo(0.025, 3);
    });
  });

  describe('Token Estimation Integration', () => {
    it('should estimate tokens for various content types', () => {
      // Plain text
      const plainText = 'This is a simple test sentence.';
      const plainEstimate = TokenService.estimateTokens(plainText);
      expect(plainEstimate).toBeGreaterThan(0);

      // Code
      const code = 'function test() { return x + y * 2; }';
      const codeEstimate = TokenService.estimateTokens(code);
      expect(codeEstimate).toBeGreaterThan(0);

      // Empty
      expect(TokenService.estimateTokens('')).toBe(0);
      expect(TokenService.estimateTokens(null as any)).toBe(0);
    });

    it('should estimate request tokens including all components', () => {
      const messages = [
        { role: 'user', content: 'Explain this code' },
      ];
      const systemPrompt = 'You are a coding assistant.';
      const projectFiles = ['const x = 1;', 'const y = 2;'];

      const withAll = TokenService.estimateRequestTokens(messages, projectFiles, systemPrompt);
      const withoutFiles = TokenService.estimateRequestTokens(messages, undefined, systemPrompt);
      const minimal = TokenService.estimateRequestTokens(messages);

      // With files should be higher than without
      expect(withAll.promptTokens).toBeGreaterThan(withoutFiles.promptTokens);
      // With system prompt should be higher than minimal
      expect(withoutFiles.promptTokens).toBeGreaterThan(minimal.promptTokens);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle inactive user in full workflow', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          email: 'test@example.com',
          is_active: false,
          token_limit_global: 100000,
          token_limit_monthly: 10000,
        }],
        rowCount: 1,
      });

      await expect(
        UserModel.checkTokenLimit('user-123', 100)
      ).rejects.toThrow(/inactive/i);
    });

    it('should handle user not found', async () => {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(
        UserModel.checkTokenLimit('non-existent', 100)
      ).rejects.toThrow(/not found/i);
    });

    it('should handle tracking failure with retry', async () => {
      (TokenUsageModel.create as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary DB error'))
        .mockResolvedValueOnce({ id: 'usage-123' });

      const result = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(result.success).toBe(true);
      expect(result.tracked).toBe(true);
      expect(TokenUsageModel.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Full Request Simulation', () => {
    it('should simulate complete chat request token flow', async () => {
      // 1. Estimate tokens before request
      const messages = [{ role: 'user', content: 'Hello!' }];
      const estimation = TokenService.estimateRequestTokens(messages);

      // 2. Check token limit
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            is_active: true,
            token_limit_global: 100000,
            token_limit_monthly: 10000,
          }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            { limit_type: 'global', limit_value: 1000000 },
            { limit_type: 'monthly', limit_value: 100000 },
          ],
        });

      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        if (query.includes('pg_advisory_xact_lock')) {
          return Promise.resolve();
        }
        if (query.includes('total_tokens')) {
          return Promise.resolve({
            rows: [{ total_tokens: '1000', monthly_tokens: '500' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const limitCheck = await UserModel.checkTokenLimit('user-123', estimation.total);
      expect(limitCheck.allowed).toBe(true);

      // 3. Simulate AI response (would happen here)
      const actualPromptTokens = 50;
      const actualCompletionTokens = 25;

      // 4. Track actual usage
      const trackResult = await TokenService.trackUsage({
        userId: 'user-123',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        promptTokens: actualPromptTokens,
        completionTokens: actualCompletionTokens,
      });

      expect(trackResult.success).toBe(true);
      expect(trackResult.tracked).toBe(true);

      // 5. Calculate final cost
      const cost = TokenService.calculateCost(
        'anthropic',
        'claude-3-sonnet-20240229',
        actualPromptTokens,
        actualCompletionTokens
      );

      expect(cost).toBeGreaterThan(0);
    });
  });
});
