import { aiService, ChatRequest } from '../../services/aiService';
import { TestHelpers } from '../utils/testHelpers';
import { Agent, ConversationMessage } from '../../types';

describe('AIService', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
  });

  describe('getProviderStatus', () => {
    it('should return provider availability status', () => {
      const status = aiService.getProviderStatus();

      expect(status).toHaveProperty('openai');
      expect(status).toHaveProperty('anthropic');
      expect(typeof status.openai).toBe('boolean');
      expect(typeof status.anthropic).toBe('boolean');
    });
  });

  describe('getAvailableModels', () => {
    // Seed test models before running these tests
    beforeEach(async () => {
      const { pool } = require('../../database/connection');
      await pool.query(`
        INSERT INTO ai_models (id, provider, name, context_window, input_cost_per_1m, output_cost_per_1m, is_active)
        VALUES
          ('gpt-3.5-turbo', 'openai', 'GPT-3.5 Turbo', 4096, 0.5, 1.5, true),
          ('gpt-4', 'openai', 'GPT-4', 8192, 30.0, 60.0, true),
          ('claude-3-sonnet', 'anthropic', 'Claude 3 Sonnet', 200000, 3.0, 15.0, true),
          ('claude-3-haiku', 'anthropic', 'Claude 3 Haiku', 200000, 0.25, 1.25, true)
        ON CONFLICT (id) DO NOTHING
      `);
    });

    it('should return available models for each provider', async () => {
      const models = await aiService.getAvailableModels();

      expect(models).toHaveProperty('openai');
      expect(models).toHaveProperty('anthropic');
      expect(Array.isArray(models.openai)).toBe(true);
      expect(Array.isArray(models.anthropic)).toBe(true);
      expect(models.openai.length).toBeGreaterThan(0);
      expect(models.anthropic.length).toBeGreaterThan(0);
    });

    it('should include expected OpenAI models', async () => {
      const models = await aiService.getAvailableModels();

      expect(models.openai).toContain('gpt-3.5-turbo');
      expect(models.openai).toContain('gpt-4');
    });

    it('should include expected Anthropic models', async () => {
      const models = await aiService.getAvailableModels();

      expect(models.anthropic).toContain('claude-3-sonnet');
      expect(models.anthropic).toContain('claude-3-haiku');
    });
  });

  describe('isModelAvailable', () => {
    // Seed test models before running these tests
    beforeEach(async () => {
      const { pool } = require('../../database/connection');
      await pool.query(`
        INSERT INTO ai_models (id, provider, name, context_window, input_cost_per_1m, output_cost_per_1m, is_active)
        VALUES
          ('gpt-3.5-turbo', 'openai', 'GPT-3.5 Turbo', 4096, 0.5, 1.5, true),
          ('gpt-4', 'openai', 'GPT-4', 8192, 30.0, 60.0, true),
          ('claude-3-sonnet', 'anthropic', 'Claude 3 Sonnet', 200000, 3.0, 15.0, true),
          ('claude-3-haiku', 'anthropic', 'Claude 3 Haiku', 200000, 0.25, 1.25, true)
        ON CONFLICT (id) DO NOTHING
      `);
    });

    it('should return true for valid OpenAI models', async () => {
      expect(await aiService.isModelAvailable('openai', 'gpt-3.5-turbo')).toBe(true);
      expect(await aiService.isModelAvailable('openai', 'gpt-4')).toBe(true);
    });

    it('should return true for valid Anthropic models', async () => {
      expect(await aiService.isModelAvailable('anthropic', 'claude-3-sonnet')).toBe(true);
      expect(await aiService.isModelAvailable('anthropic', 'claude-3-haiku')).toBe(true);
    });

    it('should return false for invalid models', async () => {
      expect(await aiService.isModelAvailable('openai', 'invalid-model')).toBe(false);
      expect(await aiService.isModelAvailable('anthropic', 'invalid-model')).toBe(false);
    });

    it('should return false for invalid providers', async () => {
      expect(await aiService.isModelAvailable('invalid' as any, 'gpt-3.5-turbo')).toBe(false);
    });
  });

  describe('chat', () => {
    const createTestAgent = (provider: 'openai' | 'anthropic'): Agent => ({
      id: 'test-agent-id',
      name: 'Test Agent',
      description: 'A test agent',
      system_prompt: 'You are a helpful assistant.',
      provider,
      model: provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-sonnet',
      temperature: 0.7,
      max_tokens: 2000,
      created_at: new Date(),
      updated_at: new Date()
    });

    const createTestMessages = (): ConversationMessage[] => [
      {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      }
    ];

    it('should route to OpenAI for OpenAI agents', async () => {
      const request: ChatRequest = {
        agent: createTestAgent('openai'),
        messages: createTestMessages()
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should route to Anthropic for Anthropic agents', async () => {
      const request: ChatRequest = {
        agent: createTestAgent('anthropic'),
        messages: createTestMessages()
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should throw error for unsupported provider', async () => {
      const invalidAgent: Agent = {
        ...createTestAgent('openai'),
        provider: 'invalid' as any,
        model: 'invalid-model'
      };

      const request: ChatRequest = {
        agent: invalidAgent,
        messages: createTestMessages()
      };

      await expect(aiService.chat(request)).rejects.toThrow('Unsupported AI provider');
    });

    it('should handle system prompt correctly', async () => {
      const agent = createTestAgent('openai');
      agent.system_prompt = 'You are a specialized assistant for testing.';

      const request: ChatRequest = {
        agent,
        messages: createTestMessages()
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should handle conversation history', async () => {
      const conversationMessages: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: new Date(Date.now() - 1000)
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date(Date.now() - 500)
        },
        {
          role: 'user',
          content: 'How are you?',
          timestamp: new Date()
        }
      ];

      const request: ChatRequest = {
        agent: createTestAgent('openai'),
        messages: conversationMessages
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should include file context when provided', async () => {
      const request: ChatRequest = {
        agent: createTestAgent('openai'),
        messages: createTestMessages(),
        projectFiles: ['console.log("Hello World");']
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should respect agent temperature setting', async () => {
      const agent = createTestAgent('openai');
      agent.temperature = 0.1;

      const request: ChatRequest = {
        agent,
        messages: createTestMessages()
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });

    it('should respect agent max_tokens setting', async () => {
      const agent = createTestAgent('openai');
      agent.max_tokens = 100;

      const request: ChatRequest = {
        agent,
        messages: createTestMessages()
      };

      const response = await aiService.chat(request);

      expect(response).toMatchObject({
        content: expect.any(String),
        metadata: expect.any(Object)
      });
    });
  });
});
