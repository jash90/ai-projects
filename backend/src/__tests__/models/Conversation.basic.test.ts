import { TestHelpers } from '../utils/testHelpers';
import { ConversationModel } from '../../models/Conversation';

describe('Conversation Model - Basic Operations', () => {
  let testUser: any;
  let testAgent: any;
  let testProject: any;

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
    testAgent = await TestHelpers.createTestAgent();
    testProject = await TestHelpers.createTestProject(testUser.id);
  });

  it('should return null for non-existent conversation', async () => {
    const conversation = await ConversationModel.findByProjectAndAgent(
      testProject.id,
      testAgent.id,
      testUser.id
    );

    expect(conversation).toBeNull();
  });

  it('should create a new conversation with messages', async () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
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
      agent_id: testAgent.id
    });
    expect(conversation.messages).toHaveLength(1);
  });

  it('should add message to conversation', async () => {
    const message = {
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
      created_at: new Date().toISOString()
    };

    const conversation = await ConversationModel.addMessage(
      testProject.id,
      testAgent.id,
      message,
      testUser.id
    );

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].content).toBe('Hello');
  });

  it('should update existing conversation with new messages', async () => {
    // Create initial conversation
    const initialMessages = [
      {
        role: 'user' as const,
        content: 'First message',
        timestamp: new Date(),
        created_at: new Date().toISOString()
      }
    ];

    await ConversationModel.createOrUpdate(
      testProject.id,
      testAgent.id,
      initialMessages,
      testUser.id
    );

    // Add another message
    const newMessage = {
      role: 'assistant' as const,
      content: 'Response message',
      timestamp: new Date(),
      created_at: new Date().toISOString()
    };

    const updatedConversation = await ConversationModel.addMessage(
      testProject.id,
      testAgent.id,
      newMessage,
      testUser.id
    );

    expect(updatedConversation.messages).toHaveLength(2);
    expect(updatedConversation.messages[1].content).toBe('Response message');
  });

  it('should get project conversations for user', async () => {
    // Create conversations with different agents
    const agent2 = await TestHelpers.createTestAgent({ name: 'Agent 2' });
    
    const message = {
      role: 'user' as const,
      content: 'Test message',
      timestamp: new Date(),
      created_at: new Date().toISOString()
    };

    await ConversationModel.addMessage(testProject.id, testAgent.id, message, testUser.id);
    await ConversationModel.addMessage(testProject.id, agent2.id, message, testUser.id);

    const conversations = await ConversationModel.getProjectConversations(testProject.id, testUser.id);

    expect(conversations).toHaveLength(2);
    expect(conversations.some(c => c.agent_id === testAgent.id)).toBe(true);
    expect(conversations.some(c => c.agent_id === agent2.id)).toBe(true);
  });
});
