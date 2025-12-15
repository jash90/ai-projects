import { UserModel } from '../../models/User';
import * as dbConnection from '../../database/connection';

// Mock the entire database module
jest.mock('../../database/connection');

// Mock errors module
jest.mock('../../utils/errors', () => ({
  createUserInactiveError: jest.fn().mockImplementation((userId: string) => {
    const error: any = new Error(`User ${userId} is inactive`);
    error.statusCode = 403;
    error.code = 'USER_INACTIVE';
    return error;
  }),
  createTokenLimitError: jest.fn().mockImplementation(
    (limitType: string, currentUsage: number, limit: number, requested: number) => {
      const error: any = new Error(
        `${limitType} token limit exceeded. Current usage: ${currentUsage}, Limit: ${limit}, Requested: ${requested}`
      );
      error.statusCode = 402;
      error.code = 'TOKEN_LIMIT_EXCEEDED';
      error.limitType = limitType;
      error.currentUsage = currentUsage;
      error.limit = limit;
      error.requested = requested;
      return error;
    }
  ),
}));

describe('UserModel.checkTokenLimit', () => {
  let mockClient: any;
  let mockPoolQuery: jest.Mock;
  let mockPoolConnect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock client for transaction operations
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Setup pool mock functions
    mockPoolQuery = jest.fn();
    mockPoolConnect = jest.fn().mockResolvedValue(mockClient);

    // Assign the mock pool (including end for cleanup)
    (dbConnection as any).pool = {
      query: mockPoolQuery,
      connect: mockPoolConnect,
      end: jest.fn().mockResolvedValue(undefined),
    };
  });

  // Helper to setup common mocks - includes both user lookup AND global limits query
  const setupUserMock = (user: any, globalLimit: number = 1000000, monthlyLimit: number = 100000) => {
    // First call: user lookup
    mockPoolQuery.mockResolvedValueOnce({
      rows: user ? [user] : [],
      rowCount: user ? 1 : 0,
    });

    // Second call: global limits lookup (only if user exists)
    if (user) {
      mockPoolQuery.mockResolvedValueOnce({
        rows: [
          { limit_type: 'global', limit_value: globalLimit },
          { limit_type: 'monthly', limit_value: monthlyLimit },
        ],
      });
    }
  };

  const setupUsageMock = (totalTokens: number, monthlyTokens: number) => {
    mockClient.query.mockImplementation((query: string) => {
      if (query.includes('BEGIN')) {
        return Promise.resolve();
      }
      if (query.includes('pg_advisory_xact_lock')) {
        return Promise.resolve();
      }
      if (query.includes('SELECT') && query.includes('total_tokens')) {
        return Promise.resolve({
          rows: [{ total_tokens: totalTokens.toString(), monthly_tokens: monthlyTokens.toString() }],
        });
      }
      if (query.includes('COMMIT') || query.includes('ROLLBACK')) {
        return Promise.resolve();
      }
      return Promise.resolve({ rows: [] });
    });
  };

  const setupGlobalLimitsMock = (globalLimit: number = 1000000, monthlyLimit: number = 100000) => {
    // Mock for getGlobalTokenLimits
    mockPoolQuery.mockImplementation((query: string) => {
      if (query.includes('global_token_limits')) {
        return Promise.resolve({
          rows: [
            { limit_type: 'global', limit_value: globalLimit },
            { limit_type: 'monthly', limit_value: monthlyLimit },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });
  };

  describe('User validation', () => {
    it('should throw error when user not found', async () => {
      setupUserMock(null);

      await expect(
        UserModel.checkTokenLimit('non-existent-user', 1000)
      ).rejects.toThrow('User not found: non-existent-user');
    });

    it('should throw error when user is inactive', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: false,
        token_limit_global: 100000,
        token_limit_monthly: 10000,
      });

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow('User user-123 is inactive');

      const { createUserInactiveError } = require('../../utils/errors');
      expect(createUserInactiveError).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Within limits scenarios', () => {
    it('should allow request when user is within both limits', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 10000,
      });

      setupUsageMock(5000, 3000);

      const result = await UserModel.checkTokenLimit('user-123', 1000);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage.totalTokens).toBe(5000);
      expect(result.currentUsage.monthlyTokens).toBe(3000);
      expect(result.limits.globalLimit).toBe(100000);
      expect(result.limits.monthlyLimit).toBe(10000);
      expect(result.remaining.global).toBe(95000);
      expect(result.remaining.monthly).toBe(7000);

      // Verify advisory lock was acquired
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('pg_advisory_xact_lock'),
        expect.arrayContaining(['token_limit_user-123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should allow request when user has no usage', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 10000,
      });

      setupUsageMock(0, 0);

      const result = await UserModel.checkTokenLimit('user-123', 1000);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage.totalTokens).toBe(0);
      expect(result.currentUsage.monthlyTokens).toBe(0);
    });
  });

  describe('Global limit enforcement', () => {
    it('should throw error when request exceeds global limit', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 50000,
      });

      setupUsageMock(9500, 5000);

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow(/global token limit exceeded/i);

      const { createTokenLimitError } = require('../../utils/errors');
      expect(createTokenLimitError).toHaveBeenCalledWith('global', 9500, 10000, 1000);

      // Verify rollback was called
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should block request when exactly at global limit', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 50000,
      });

      setupUsageMock(10000, 5000);

      await expect(
        UserModel.checkTokenLimit('user-123', 1)
      ).rejects.toThrow(/global token limit exceeded/i);
    });
  });

  describe('Monthly limit enforcement', () => {
    it('should throw error when request exceeds monthly limit', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 5000,
      });

      setupUsageMock(10000, 4500);

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow(/monthly token limit exceeded/i);

      const { createTokenLimitError } = require('../../utils/errors');
      expect(createTokenLimitError).toHaveBeenCalledWith('monthly', 4500, 5000, 1000);
    });

    it('should block request when exactly at monthly limit', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 5000,
      });

      setupUsageMock(10000, 5000);

      await expect(
        UserModel.checkTokenLimit('user-123', 1)
      ).rejects.toThrow(/monthly token limit exceeded/i);
    });
  });

  describe('Unlimited access scenarios', () => {
    it('should allow unlimited access when global limit is 0', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 0, // 0 means unlimited
        token_limit_monthly: 0, // Also set monthly to unlimited to test global specifically
      });

      setupUsageMock(1000000, 500000);

      const result = await UserModel.checkTokenLimit('user-123', 100000);

      expect(result.allowed).toBe(true);
      expect(result.remaining.global).toBe(-1); // -1 indicates unlimited
    });

    it('should allow unlimited monthly access when monthly limit is 0', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 1000000,
        token_limit_monthly: 0, // 0 means unlimited
      });

      setupUsageMock(500000, 500000);

      const result = await UserModel.checkTokenLimit('user-123', 100000);

      expect(result.allowed).toBe(true);
      expect(result.remaining.monthly).toBe(-1); // -1 indicates unlimited
    });
  });

  describe('Global defaults fallback', () => {
    it('should use global defaults when user limits are null', async () => {
      const globalDefaults = { global: 500000, monthly: 50000 };

      // First call returns user, second call returns global limits
      mockPoolQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            email: 'test@example.com',
            is_active: true,
            token_limit_global: null,
            token_limit_monthly: null,
          }],
          rowCount: 1,
        })
        // Second call returns global limits
        .mockResolvedValueOnce({
          rows: [
            { limit_type: 'global', limit_value: globalDefaults.global },
            { limit_type: 'monthly', limit_value: globalDefaults.monthly },
          ],
        });

      setupUsageMock(10000, 5000);

      const result = await UserModel.checkTokenLimit('user-123', 1000);

      expect(result.allowed).toBe(true);
      expect(result.limits.globalLimit).toBe(globalDefaults.global);
      expect(result.limits.monthlyLimit).toBe(globalDefaults.monthly);
    });
  });

  describe('Transaction management', () => {
    it('should properly commit transaction on success', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 10000,
      });

      setupUsageMock(5000, 3000);

      await UserModel.checkTokenLimit('user-123', 1000);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should properly rollback transaction on error', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 50000,
      });

      setupUsageMock(9500, 5000);

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow();

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should always release client connection', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 50000,
      });

      // Force an error during usage query
      mockClient.query.mockImplementation((query: string) => {
        if (query.includes('BEGIN')) {
          return Promise.resolve();
        }
        if (query.includes('pg_advisory_xact_lock')) {
          return Promise.resolve();
        }
        if (query.includes('SELECT') && query.includes('total_tokens')) {
          return Promise.reject(new Error('Database error'));
        }
        if (query.includes('ROLLBACK')) {
          return Promise.resolve();
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        UserModel.checkTokenLimit('user-123', 1000)
      ).rejects.toThrow('Database error');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle very large token counts', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000000000, // 10 billion
        token_limit_monthly: 1000000000, // 1 billion
      });

      setupUsageMock(5000000000, 500000000);

      const result = await UserModel.checkTokenLimit('user-123', 1000000);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage.totalTokens).toBe(5000000000);
    });

    it('should handle zero tokens request', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 5000,
      });

      setupUsageMock(10000, 5000); // At limits

      const result = await UserModel.checkTokenLimit('user-123', 0);

      expect(result.allowed).toBe(true); // 0 tokens should always be allowed
    });

    it('should handle request that would exactly reach limit', async () => {
      setupUserMock({
        id: 'user-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 10000,
        token_limit_monthly: 5000,
      });

      setupUsageMock(9000, 4000);

      // Request that would bring to exactly 10000 (the limit)
      const result = await UserModel.checkTokenLimit('user-123', 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining.global).toBe(1000);
    });
  });

  describe('Advisory lock verification', () => {
    it('should acquire advisory lock with correct key pattern', async () => {
      setupUserMock({
        id: 'user-abc-123',
        email: 'test@example.com',
        is_active: true,
        token_limit_global: 100000,
        token_limit_monthly: 10000,
      });

      setupUsageMock(5000, 3000);

      await UserModel.checkTokenLimit('user-abc-123', 1000);

      // Find the advisory lock call
      const lockCall = mockClient.query.mock.calls.find(
        (call: any[]) => call[0].includes('pg_advisory_xact_lock')
      );

      expect(lockCall).toBeDefined();
      expect(lockCall[1]).toEqual(['token_limit_user-abc-123']);
    });
  });
});
