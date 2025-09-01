import { AgentModel } from '../../models/Agent';
import { TestHelpers } from '../utils/testHelpers';
import { v4 as uuidv4 } from 'uuid';

describe('AgentModel', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    await TestHelpers.seedDatabase();
  });

  describe('findAll', () => {
    it('should return all agents', async () => {
      const agents = await AgentModel.findAll();

      expect(agents).toHaveLength(2); // From seedDatabase
      expect(agents[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        system_prompt: expect.any(String),
        provider: expect.any(String),
        model: expect.any(String),
        temperature: expect.any(Number),
        max_tokens: expect.any(Number)
      });
    });

    it('should return empty array when no agents exist', async () => {
      await TestHelpers.cleanDatabase();
      
      const agents = await AgentModel.findAll();

      expect(agents).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should find agent by ID', async () => {
      const testAgent = await TestHelpers.createTestAgent();
      
      const agent = await AgentModel.findById(testAgent.id);

      expect(agent).toMatchObject({
        id: testAgent.id,
        name: testAgent.name,
        description: testAgent.description,
        system_prompt: testAgent.system_prompt,
        provider: testAgent.provider,
        model: testAgent.model,
        temperature: testAgent.temperature,
        max_tokens: testAgent.max_tokens
      });
    });

    it('should return null for non-existent agent', async () => {
      const nonExistentId = uuidv4();
      
      const agent = await AgentModel.findById(nonExistentId);

      expect(agent).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new agent successfully', async () => {
      const agentData = {
        name: 'New Test Agent',
        description: 'A newly created test agent',
        system_prompt: 'You are a new test assistant.',
        provider: 'anthropic' as const,
        model: 'claude-3-sonnet',
        temperature: 0.5,
        max_tokens: 1500
      };

      const agent = await AgentModel.create(agentData);

      expect(agent).toMatchObject(agentData);
      expect(agent.id).toBeDefined();
      expect(agent.created_at).toBeDefined();
      expect(agent.updated_at).toBeDefined();
    });

    it('should use default values for optional fields', async () => {
      const agentData = {
        name: 'Minimal Agent',
        system_prompt: 'You are a minimal assistant.'
      };

      const agent = await AgentModel.create(agentData);

      expect(agent.name).toBe(agentData.name);
      expect(agent.system_prompt).toBe(agentData.system_prompt);
      expect(agent.provider).toBe('openai'); // default
      expect(agent.model).toBe('gpt-3.5-turbo'); // default
      expect(agent.temperature).toBe(0.7); // default
      expect(agent.max_tokens).toBe(2000); // default
    });

    it('should reject invalid provider', async () => {
      const agentData = {
        name: 'Invalid Agent',
        system_prompt: 'Test prompt',
        provider: 'invalid_provider' as any
      };

      await expect(AgentModel.create(agentData)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update agent successfully', async () => {
      const testAgent = await TestHelpers.createTestAgent();
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated description',
        temperature: 0.9
      };

      const updatedAgent = await AgentModel.update(testAgent.id, updateData);

      expect(updatedAgent).toMatchObject({
        id: testAgent.id,
        name: updateData.name,
        description: updateData.description,
        temperature: updateData.temperature,
        system_prompt: testAgent.system_prompt, // unchanged
        provider: testAgent.provider, // unchanged
        model: testAgent.model // unchanged
      });
      expect(updatedAgent?.updated_at).not.toBe(testAgent.updated_at);
    });

    it('should return null for non-existent agent', async () => {
      const nonExistentId = uuidv4();
      
      const updatedAgent = await AgentModel.update(nonExistentId, { name: 'New Name' });

      expect(updatedAgent).toBeNull();
    });

    it('should validate temperature range', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      await expect(AgentModel.update(testAgent.id, { temperature: -1 })).rejects.toThrow();
      await expect(AgentModel.update(testAgent.id, { temperature: 3 })).rejects.toThrow();
    });

    it('should validate max_tokens positive value', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      await expect(AgentModel.update(testAgent.id, { max_tokens: 0 })).rejects.toThrow();
      await expect(AgentModel.update(testAgent.id, { max_tokens: -100 })).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete agent successfully', async () => {
      const testAgent = await TestHelpers.createTestAgent();
      
      const deleted = await AgentModel.delete(testAgent.id);

      expect(deleted).toBe(true);
      
      // Verify agent is deleted
      const agent = await AgentModel.findById(testAgent.id);
      expect(agent).toBeNull();
    });

    it('should return false for non-existent agent', async () => {
      const nonExistentId = uuidv4();
      
      const deleted = await AgentModel.delete(nonExistentId);

      expect(deleted).toBe(false);
    });
  });

  describe('findByProvider', () => {
    it('should find agents by provider', async () => {
      await TestHelpers.createTestAgent({ provider: 'openai' });
      await TestHelpers.createTestAgent({ provider: 'anthropic' });
      
      const openaiAgents = await AgentModel.findByProvider('openai');
      const anthropicAgents = await AgentModel.findByProvider('anthropic');

      expect(openaiAgents.length).toBeGreaterThan(0);
      expect(anthropicAgents.length).toBeGreaterThan(0);
      
      openaiAgents.forEach(agent => {
        expect(agent.provider).toBe('openai');
      });
      
      anthropicAgents.forEach(agent => {
        expect(agent.provider).toBe('anthropic');
      });
    });

    it('should return empty array for provider with no agents', async () => {
      await TestHelpers.cleanDatabase();
      
      const agents = await AgentModel.findByProvider('openai');

      expect(agents).toHaveLength(0);
    });
  });
});
