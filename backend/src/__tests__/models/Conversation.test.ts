import { ConversationModel } from '../../models/Conversation';
import { TestHelpers } from '../utils/testHelpers';
import { ConversationMessage } from '../../types';
import { v4 as uuidv4 } from 'uuid';

describe('ConversationModel', () => {
  let testUser: any;
  let testAgent: any;
  let testProject: any;

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
    testAgent = await TestHelpers.createTestAgent();
    testProject = await TestHelpers.createTestProject(testUser.id);
  });

  describe('findByProjectAndAgent', () => {
    it('should return null when no conversation exists', async () => {
      const conversation = await ConversationModel.findByProjectAndAgent(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(conversation).toBeNull();
    });

    it('should find existing conversation', async () => {
      const messages: ConversationMessage[] = [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        messages,
        testUser.id
      );

      const conversation = await ConversationModel.findByProjectAndAgent(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(conversation).toMatchObject({
        project_id: testProject.id,
        agent_id: testAgent.id,
        messages: messages
      });
    });

    it('should reject access for non-owner user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      await expect(
        ConversationModel.findByProjectAndAgent(
          testProject.id,
          testAgent.id,
          otherUser.id
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('createOrUpdate', () => {
    it('should create new conversation', async () => {
      const messages: ConversationMessage[] = [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date().toISOString()
        }
      ];

      const conversation = await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        messages,
        testUser.id
      );

      expect(conversation).toMatchObject({
        project_id: testProject.id,
        agent_id: testAgent.id,
        messages: messages
      });
      expect(conversation.id).toBeDefined();
      expect(conversation.created_at).toBeDefined();
      expect(conversation.updated_at).toBeDefined();
    });

    it('should update existing conversation', async () => {
      const initialMessages: ConversationMessage[] = [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      const conversation1 = await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        initialMessages,
        testUser.id
      );

      const updatedMessages: ConversationMessage[] = [
        ...initialMessages,
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date().toISOString()
        }
      ];

      const conversation2 = await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        updatedMessages,
        testUser.id
      );

      expect(conversation2.id).toBe(conversation1.id); // Same conversation
      expect(conversation2.messages).toHaveLength(2);
      expect(conversation2.updated_at).not.toBe(conversation1.updated_at);
    });

    it('should reject access for non-owner user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      const messages: ConversationMessage[] = [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        }
      ];

      await expect(
        ConversationModel.createOrUpdate(
          testProject.id,
          testAgent.id,
          messages,
          otherUser.id
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('addMessage', () => {
    it('should add message to new conversation', async () => {
      const message: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString()
      };

      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        message,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0]).toMatchObject(message);
    });

    it('should add message to existing conversation', async () => {
      const firstMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString()
      };

      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        firstMessage,
        testUser.id
      );

      const secondMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Hi there!',
        created_at: new Date().toISOString()
      };

      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        secondMessage,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0]).toMatchObject(firstMessage);
      expect(conversation.messages[1]).toMatchObject(secondMessage);
    });

    it('should preserve message order by timestamp', async () => {
      const olderMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'First message',
        created_at: new Date(Date.now() - 1000).toISOString()
      };

      const newerMessage: ConversationMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Second message',
        created_at: new Date().toISOString()
      };

      // Add newer message first
      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        newerMessage,
        testUser.id
      );

      // Add older message
      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        olderMessage,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(2);
      // Should be ordered by timestamp regardless of insertion order
      expect(conversation.messages[0].content).toBe('First message');
      expect(conversation.messages[1].content).toBe('Second message');
    });
  });

  describe('clearConversation', () => {
    it('should clear existing conversation', async () => {
      const message: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString()
      };

      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        message,
        testUser.id
      );

      const cleared = await ConversationModel.clearConversation(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(cleared).toBe(true);

      // Verify conversation is deleted
      const conversation = await ConversationModel.findByProjectAndAgent(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(conversation).toBeNull();
    });

    it('should return false for non-existent conversation', async () => {
      const cleared = await ConversationModel.clearConversation(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(cleared).toBe(false);
    });

    it('should reject access for non-owner user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      await expect(
        ConversationModel.clearConversation(
          testProject.id,
          testAgent.id,
          otherUser.id
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getProjectConversations', () => {
    it('should return all conversations for a project', async () => {
      const agent2 = await TestHelpers.createTestAgent({
        name: 'Second Agent'
      });

      // Create conversations with different agents
      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello Agent 1',
          created_at: new Date().toISOString()
        },
        testUser.id
      );

      await ConversationModel.addMessage(
        testProject.id,
        agent2.id,
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello Agent 2',
          created_at: new Date().toISOString()
        },
        testUser.id
      );

      const conversations = await ConversationModel.getProjectConversations(
        testProject.id,
        testUser.id
      );

      expect(conversations).toHaveLength(2);
      expect(conversations.some(c => c.agent_id === testAgent.id)).toBe(true);
      expect(conversations.some(c => c.agent_id === agent2.id)).toBe(true);
    });

    it('should include agent names', async () => {
      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        },
        testUser.id
      );

      const conversations = await ConversationModel.getProjectConversations(
        testProject.id,
        testUser.id
      );

      expect(conversations).toHaveLength(1);
      expect(conversations[0].agent_name).toBe(testAgent.name);
    });

    it('should return empty array for project with no conversations', async () => {
      const conversations = await ConversationModel.getProjectConversations(
        testProject.id,
        testUser.id
      );

      expect(conversations).toHaveLength(0);
    });

    it('should reject access for non-owner user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      await expect(
        ConversationModel.getProjectConversations(
          testProject.id,
          otherUser.id
        )
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getConversationStats', () => {
    it('should return stats for existing conversation', async () => {
      const messages: ConversationMessage[] = [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Hello',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'Hi there!',
          created_at: new Date().toISOString()
        }
      ];

      const conversation = await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        messages,
        testUser.id
      );

      const stats = await ConversationModel.getConversationStats(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(stats).toMatchObject({
        message_count: 2,
        last_activity: conversation.updated_at
      });
    });

    it('should return zero stats for non-existent conversation', async () => {
      const stats = await ConversationModel.getConversationStats(
        testProject.id,
        testAgent.id,
        testUser.id
      );

      expect(stats).toMatchObject({
        message_count: 0,
        last_activity: null
      });
    });
  });
});
