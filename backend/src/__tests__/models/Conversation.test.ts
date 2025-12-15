import { ConversationModel } from '../../models/Conversation';
import { TestHelpers } from '../utils/testHelpers';
import { ConversationMessage } from '../../types';

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
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
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

      expect(conversation).not.toBeNull();
      expect(conversation!.project_id).toBe(testProject.id);
      expect(conversation!.agent_id).toBe(testAgent.id);
      expect(conversation!.messages).toHaveLength(1);
      expect(conversation!.messages[0].role).toBe('user');
      expect(conversation!.messages[0].content).toBe('Hello');
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
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date()
        }
      ];

      const conversation = await ConversationModel.createOrUpdate(
        testProject.id,
        testAgent.id,
        messages,
        testUser.id
      );

      expect(conversation.project_id).toBe(testProject.id);
      expect(conversation.agent_id).toBe(testAgent.id);
      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0].role).toBe('user');
      expect(conversation.messages[0].content).toBe('Hello');
      expect(conversation.messages[1].role).toBe('assistant');
      expect(conversation.messages[1].content).toBe('Hi there!');
      expect(conversation.id).toBeDefined();
      expect(conversation.created_at).toBeDefined();
      expect(conversation.updated_at).toBeDefined();
    });

    it('should update existing conversation', async () => {
      const initialMessages: ConversationMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
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
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date()
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
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
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
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        message,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].role).toBe(message.role);
      expect(conversation.messages[0].content).toBe(message.content);
    });

    it('should add message to existing conversation', async () => {
      const firstMessage: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        firstMessage,
        testUser.id
      );

      const secondMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date()
      };

      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        secondMessage,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[0].role).toBe(firstMessage.role);
      expect(conversation.messages[0].content).toBe(firstMessage.content);
      expect(conversation.messages[1].role).toBe(secondMessage.role);
      expect(conversation.messages[1].content).toBe(secondMessage.content);
    });

    it('should maintain message insertion order', async () => {
      // Messages are added in order, most recent last
      const firstMessage: ConversationMessage = {
        role: 'user',
        content: 'First message',
        timestamp: new Date()
      };

      await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        firstMessage,
        testUser.id
      );

      const secondMessage: ConversationMessage = {
        role: 'assistant',
        content: 'Second message',
        timestamp: new Date()
      };

      const conversation = await ConversationModel.addMessage(
        testProject.id,
        testAgent.id,
        secondMessage,
        testUser.id
      );

      expect(conversation.messages).toHaveLength(2);
      // Messages are in insertion order
      expect(conversation.messages[0].content).toBe('First message');
      expect(conversation.messages[1].content).toBe('Second message');
    });
  });

  describe('clearConversation', () => {
    it('should clear existing conversation', async () => {
      const message: ConversationMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
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
          role: 'user',
          content: 'Hello Agent 1',
          timestamp: new Date()
        },
        testUser.id
      );

      await ConversationModel.addMessage(
        testProject.id,
        agent2.id,
        {
          role: 'user',
          content: 'Hello Agent 2',
          timestamp: new Date()
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
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        },
        testUser.id
      );

      const conversations = await ConversationModel.getProjectConversations(
        testProject.id,
        testUser.id
      );

      expect(conversations).toHaveLength(1);
      // agent_name is added by SQL JOIN but not in Conversation type
      expect((conversations[0] as any).agent_name).toBe(testAgent.name);
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
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date()
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
