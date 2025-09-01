import { aiService } from '../../services/aiService';
import { TestHelpers } from '../utils/testHelpers';

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
    it('should return available models for each provider', () => {
      const models = aiService.getAvailableModels();
      
      expect(models).toHaveProperty('openai');
      expect(models).toHaveProperty('anthropic');
      expect(Array.isArray(models.openai)).toBe(true);
      expect(Array.isArray(models.anthropic)).toBe(true);
      expect(models.openai.length).toBeGreaterThan(0);
      expect(models.anthropic.length).toBeGreaterThan(0);
    });

    it('should include expected OpenAI models', () => {
      const models = aiService.getAvailableModels();
      
      expect(models.openai).toContain('gpt-3.5-turbo');
      expect(models.openai).toContain('gpt-4');
    });

    it('should include expected Anthropic models', () => {
      const models = aiService.getAvailableModels();
      
      expect(models.anthropic).toContain('claude-3-sonnet');
      expect(models.anthropic).toContain('claude-3-haiku');
    });
  });

  describe('isModelAvailable', () => {
    it('should return true for valid OpenAI models', () => {
      expect(aiService.isModelAvailable('openai', 'gpt-3.5-turbo')).toBe(true);
      expect(aiService.isModelAvailable('openai', 'gpt-4')).toBe(true);
    });

    it('should return true for valid Anthropic models', () => {
      expect(aiService.isModelAvailable('anthropic', 'claude-3-sonnet')).toBe(true);
      expect(aiService.isModelAvailable('anthropic', 'claude-3-haiku')).toBe(true);
    });

    it('should return false for invalid models', () => {
      expect(aiService.isModelAvailable('openai', 'invalid-model')).toBe(false);
      expect(aiService.isModelAvailable('anthropic', 'invalid-model')).toBe(false);
    });

    it('should return false for invalid providers', () => {
      expect(aiService.isModelAvailable('invalid' as any, 'gpt-3.5-turbo')).toBe(false);
    });
  });

  describe('chatWithOpenAI', () => {
    const testAgent = {
      id: 'test-agent-id',
      name: 'Test Agent',
      description: 'A test agent',
      system_prompt: 'You are a helpful assistant.',
      provider: 'openai' as const,
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        created_at: new Date().toISOString()
      }
    ];

    it('should return mock response for OpenAI chat', async () => {
      const response = await aiService.chatWithOpenAI(testAgent, testMessages, []);

      expect(response).toMatchObject({
        content: 'Mock AI response',
        usage: {
          prompt_tokens: expect.any(Number),
          completion_tokens: expect.any(Number),
          total_tokens: expect.any(Number)
        }
      });
    });

    it('should handle system prompt correctly', async () => {
      const agentWithSystemPrompt = {
        ...testAgent,
        system_prompt: 'You are a specialized assistant for testing.'
      };

      const response = await aiService.chatWithOpenAI(agentWithSystemPrompt, testMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });

    it('should handle conversation history', async () => {
      const conversationMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date(Date.now() - 1000).toISOString()
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Hi there!',
          created_at: new Date(Date.now() - 500).toISOString()
        },
        {
          id: 'msg-3',
          role: 'user' as const,
          content: 'How are you?',
          created_at: new Date().toISOString()
        }
      ];

      const response = await aiService.chatWithOpenAI(testAgent, conversationMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });

    it('should include file context when provided', async () => {
      const fileContext = [
        {
          name: 'test.js',
          content: 'console.log("Hello World");',
          type: 'javascript'
        }
      ];

      const response = await aiService.chatWithOpenAI(testAgent, testMessages, fileContext);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });

    it('should respect agent temperature setting', async () => {
      const lowTempAgent = {
        ...testAgent,
        temperature: 0.1
      };

      const response = await aiService.chatWithOpenAI(lowTempAgent, testMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });

    it('should respect agent max_tokens setting', async () => {
      const limitedAgent = {
        ...testAgent,
        max_tokens: 100
      };

      const response = await aiService.chatWithOpenAI(limitedAgent, testMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });
  });

  describe('chatWithAnthropic', () => {
    const testAgent = {
      id: 'test-agent-id',
      name: 'Test Agent',
      description: 'A test agent',
      system_prompt: 'You are a helpful assistant.',
      provider: 'anthropic' as const,
      model: 'claude-3-sonnet',
      temperature: 0.7,
      max_tokens: 2000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const testMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        created_at: new Date().toISOString()
      }
    ];

    it('should return mock response for Anthropic chat', async () => {
      const response = await aiService.chatWithAnthropic(testAgent, testMessages, []);

      expect(response).toMatchObject({
        content: 'Mock Anthropic response',
        usage: {
          prompt_tokens: expect.any(Number),
          completion_tokens: expect.any(Number),
          total_tokens: expect.any(Number)
        }
      });
    });

    it('should handle system prompt correctly', async () => {
      const agentWithSystemPrompt = {
        ...testAgent,
        system_prompt: 'You are a specialized assistant for testing.'
      };

      const response = await aiService.chatWithAnthropic(agentWithSystemPrompt, testMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });

    it('should handle conversation history', async () => {
      const conversationMessages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date(Date.now() - 1000).toISOString()
        },
        {
          id: 'msg-2',
          role: 'assistant' as const,
          content: 'Hi there!',
          created_at: new Date(Date.now() - 500).toISOString()
        },
        {
          id: 'msg-3',
          role: 'user' as const,
          content: 'How are you?',
          created_at: new Date().toISOString()
        }
      ];

      const response = await aiService.chatWithAnthropic(testAgent, conversationMessages, []);

      expect(response).toMatchObject({
        content: expect.any(String),
        usage: expect.any(Object)
      });
    });
  });

  describe('chat', () => {
    it('should route to OpenAI for OpenAI agents', async () => {
      const openaiAgent = {
        id: 'test-agent-id',
        name: 'OpenAI Agent',
        description: 'An OpenAI test agent',
        system_prompt: 'You are a helpful assistant.',
        provider: 'openai' as const,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      const response = await aiService.chat(openaiAgent, messages, []);

      expect(response).toMatchObject({
        content: 'Mock AI response', // From OpenAI mock
        usage: expect.any(Object)
      });
    });

    it('should route to Anthropic for Anthropic agents', async () => {
      const anthropicAgent = {
        id: 'test-agent-id',
        name: 'Anthropic Agent',
        description: 'An Anthropic test agent',
        system_prompt: 'You are a helpful assistant.',
        provider: 'anthropic' as const,
        model: 'claude-3-sonnet',
        temperature: 0.7,
        max_tokens: 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      const response = await aiService.chat(anthropicAgent, messages, []);

      expect(response).toMatchObject({
        content: 'Mock Anthropic response', // From Anthropic mock
        usage: expect.any(Object)
      });
    });

    it('should throw error for unsupported provider', async () => {
      const invalidAgent = {
        id: 'test-agent-id',
        name: 'Invalid Agent',
        description: 'An invalid test agent',
        system_prompt: 'You are a helpful assistant.',
        provider: 'invalid' as any,
        model: 'invalid-model',
        temperature: 0.7,
        max_tokens: 2000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const messages = [
        {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      await expect(aiService.chat(invalidAgent, messages, [])).rejects.toThrow('Unsupported AI provider');
    });
  });
});
