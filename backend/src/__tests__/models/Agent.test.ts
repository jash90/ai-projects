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

    it('should use default values for temperature and max_tokens', async () => {
      const agentData = {
        name: 'Minimal Agent',
        system_prompt: 'You are a minimal assistant.',
        provider: 'openai' as const,
        model: 'gpt-3.5-turbo'
      };

      const agent = await AgentModel.create(agentData);

      expect(agent.name).toBe(agentData.name);
      expect(agent.system_prompt).toBe(agentData.system_prompt);
      expect(agent.provider).toBe('openai');
      expect(agent.model).toBe('gpt-3.5-turbo');
      expect(agent.temperature).toBe(0.7); // default
      expect(agent.max_tokens).toBe(2000); // default
    });

    it('should reject invalid provider', async () => {
      const agentData = {
        name: 'Invalid Agent',
        system_prompt: 'Test prompt',
        provider: 'invalid_provider' as any,
        model: 'some-model'
      };

      await expect(AgentModel.create(agentData)).rejects.toThrow();
    });
  });

  describe('updateById', () => {
    it('should update agent successfully', async () => {
      const testAgent = await TestHelpers.createTestAgent();
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated description',
        temperature: 0.9
      };

      const updatedAgent = await AgentModel.updateById(testAgent.id, updateData);

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

      const updatedAgent = await AgentModel.updateById(nonExistentId, { name: 'New Name' });

      expect(updatedAgent).toBeNull();
    });

    it('should allow updating temperature within valid range', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      const updatedAgent = await AgentModel.updateById(testAgent.id, { temperature: 0.5 });
      expect(updatedAgent?.temperature).toBe(0.5);
    });

    it('should allow updating max_tokens to valid value', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      const updatedAgent = await AgentModel.updateById(testAgent.id, { max_tokens: 3000 });
      expect(updatedAgent?.max_tokens).toBe(3000);
    });
  });

  describe('deleteById', () => {
    it('should delete agent successfully', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      const deleted = await AgentModel.deleteById(testAgent.id);

      expect(deleted).toBe(true);

      // Verify agent is deleted
      const agent = await AgentModel.findById(testAgent.id);
      expect(agent).toBeNull();
    });

    it('should return false for non-existent agent', async () => {
      const nonExistentId = uuidv4();

      const deleted = await AgentModel.deleteById(nonExistentId);

      expect(deleted).toBe(false);
    });
  });

  describe('getUsageCount', () => {
    it('should return zero for agent with no conversations', async () => {
      const testAgent = await TestHelpers.createTestAgent();

      const count = await AgentModel.getUsageCount(testAgent.id);

      expect(count).toBe(0);
    });
  });
});
