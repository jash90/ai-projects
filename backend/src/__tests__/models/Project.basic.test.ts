import { TestHelpers } from '../utils/testHelpers';
import { ProjectModel } from '../../models/Project';

describe('Project Model - Basic Operations', () => {
  let testUser: any;

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
  });

  it('should create a new project', async () => {
    const projectData = {
      name: 'Test Project',
      description: 'A test project',
      user_id: testUser.id
    };

    const project = await ProjectModel.create(projectData);

    expect(project).toMatchObject({
      name: projectData.name,
      description: projectData.description,
      user_id: projectData.user_id
    });
    expect(project.id).toBeDefined();
  });

  it('should find projects by user ID', async () => {
    await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
    await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });

    const result = await ProjectModel.findByUserId(testUser.id, 1, 10);

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should find projects with pagination', async () => {
    await TestHelpers.createTestProject(testUser.id, { name: 'Recent Project 1' });
    await TestHelpers.createTestProject(testUser.id, { name: 'Recent Project 2' });

    const result = await ProjectModel.findByUserId(testUser.id, 1, 5);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toMatch(/Recent Project/);
  });

  it('should return empty results for user with no projects', async () => {
    const result = await ProjectModel.findByUserId(testUser.id, 1, 10);

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
