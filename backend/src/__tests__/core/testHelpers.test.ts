import { TestHelpers } from '../utils/testHelpers';

describe('Test Helpers', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
  });

  it('should generate valid JWT tokens', () => {
    const tokens = TestHelpers.generateTokens('test-user-id');
    
    expect(tokens.access_token).toBeDefined();
    expect(tokens.refresh_token).toBeDefined();
    expect(typeof tokens.access_token).toBe('string');
    expect(typeof tokens.refresh_token).toBe('string');
  });

  it('should create test users with proper structure', async () => {
    const testUser = await TestHelpers.createTestUser({
      email: 'custom@example.com',
      username: 'customuser'
    });

    expect(testUser).toMatchObject({
      email: 'custom@example.com',
      username: 'customuser',
      password: expect.any(String)
    });
    expect(testUser.id).toBeDefined();
  });

  it('should create test agents with proper structure', async () => {
    const testAgent = await TestHelpers.createTestAgent({
      name: 'Custom Agent',
      provider: 'openai'
    });

    expect(testAgent).toMatchObject({
      name: 'Custom Agent',
      provider: 'openai',
      model: expect.any(String)
    });
    expect(testAgent.id).toBeDefined();
  });

  it('should create test projects with proper structure', async () => {
    const testUser = await TestHelpers.createTestUser();
    const testProject = await TestHelpers.createTestProject(testUser.id, {
      name: 'Custom Project'
    });

    expect(testProject).toMatchObject({
      name: 'Custom Project',
      user_id: testUser.id
    });
    expect(testProject.id).toBeDefined();
  });

  it('should clean database properly', async () => {
    // Create some test data
    const testUser = await TestHelpers.createTestUser();
    const testProject = await TestHelpers.createTestProject(testUser.id);
    
    // Clean the database
    await TestHelpers.cleanDatabase();
    
    // Verify data is cleaned
    const { UserModel } = require('../../models/User');
    const { ProjectModel } = require('../../models/Project');
    
    const user = await UserModel.findById(testUser.id);
    const result = await ProjectModel.findByUserId(testUser.id, 1, 10);
    
    expect(user).toBeNull();
    expect(result.items).toHaveLength(0);
  });
});
