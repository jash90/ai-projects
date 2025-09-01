import { ProjectModel } from '../../models/Project';
import { TestHelpers } from '../utils/testHelpers';
import { v4 as uuidv4 } from 'uuid';

describe('ProjectModel', () => {
  let testUser: any;

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
  });

  describe('create', () => {
    it('should create a new project successfully', async () => {
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
      expect(project.created_at).toBeDefined();
      expect(project.updated_at).toBeDefined();
    });

    it('should create project without description', async () => {
      const projectData = {
        name: 'Minimal Project',
        user_id: testUser.id
      };

      const project = await ProjectModel.create(projectData);

      expect(project.name).toBe(projectData.name);
      expect(project.user_id).toBe(projectData.user_id);
      expect(project.description).toBeNull();
    });

    it('should reject project with non-existent user', async () => {
      const projectData = {
        name: 'Invalid Project',
        user_id: uuidv4()
      };

      await expect(ProjectModel.create(projectData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find project by ID', async () => {
      const testProject = await TestHelpers.createTestProject(testUser.id);
      
      const project = await ProjectModel.findById(testProject.id);

      expect(project).toMatchObject({
        id: testProject.id,
        name: testProject.name,
        description: testProject.description,
        user_id: testProject.user_id
      });
    });

    it('should return null for non-existent project', async () => {
      const nonExistentId = uuidv4();
      
      const project = await ProjectModel.findById(nonExistentId);

      expect(project).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find projects by user ID with pagination', async () => {
      // Create multiple projects
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 3' });

      const result = await ProjectModel.findByUserId(testUser.id, 1, 2);

      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it('should search projects by name', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'React App' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Vue App' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Angular Project' });

      const result = await ProjectModel.findByUserId(testUser.id, 1, 10, 'App');

      expect(result.projects).toHaveLength(2);
      expect(result.projects.every(p => p.name.includes('App'))).toBe(true);
    });

    it('should return empty result for user with no projects', async () => {
      const otherUser = await TestHelpers.createTestUser({ 
        email: 'other@example.com', 
        username: 'otheruser' 
      });

      const result = await ProjectModel.findByUserId(otherUser.id);

      expect(result.projects).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should only return projects for specified user', async () => {
      const otherUser = await TestHelpers.createTestUser({ 
        email: 'other@example.com', 
        username: 'otheruser' 
      });

      await TestHelpers.createTestProject(testUser.id, { name: 'User 1 Project' });
      await TestHelpers.createTestProject(otherUser.id, { name: 'User 2 Project' });

      const result = await ProjectModel.findByUserId(testUser.id);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].name).toBe('User 1 Project');
      expect(result.projects[0].user_id).toBe(testUser.id);
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const testProject = await TestHelpers.createTestProject(testUser.id);
      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      };

      const updatedProject = await ProjectModel.update(testProject.id, updateData);

      expect(updatedProject).toMatchObject({
        id: testProject.id,
        name: updateData.name,
        description: updateData.description,
        user_id: testProject.user_id
      });
      expect(updatedProject?.updated_at).not.toBe(testProject.updated_at);
    });

    it('should update only provided fields', async () => {
      const testProject = await TestHelpers.createTestProject(testUser.id);
      const updateData = {
        name: 'New Name Only'
      };

      const updatedProject = await ProjectModel.update(testProject.id, updateData);

      expect(updatedProject?.name).toBe(updateData.name);
      expect(updatedProject?.description).toBe(testProject.description);
    });

    it('should return null for non-existent project', async () => {
      const nonExistentId = uuidv4();
      
      const updatedProject = await ProjectModel.update(nonExistentId, { name: 'New Name' });

      expect(updatedProject).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const testProject = await TestHelpers.createTestProject(testUser.id);
      
      const deleted = await ProjectModel.delete(testProject.id);

      expect(deleted).toBe(true);
      
      // Verify project is deleted
      const project = await ProjectModel.findById(testProject.id);
      expect(project).toBeNull();
    });

    it('should return false for non-existent project', async () => {
      const nonExistentId = uuidv4();
      
      const deleted = await ProjectModel.delete(nonExistentId);

      expect(deleted).toBe(false);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent projects ordered by update time', async () => {
      const project1 = await TestHelpers.createTestProject(testUser.id, { name: 'Old Project' });
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const project2 = await TestHelpers.createTestProject(testUser.id, { name: 'Recent Project' });

      const recentProjects = await ProjectModel.getRecentActivity(testUser.id, 5);

      expect(recentProjects).toHaveLength(2);
      expect(recentProjects[0].id).toBe(project2.id); // Most recent first
      expect(recentProjects[1].id).toBe(project1.id);
    });

    it('should limit results correctly', async () => {
      // Create 5 projects
      for (let i = 1; i <= 5; i++) {
        await TestHelpers.createTestProject(testUser.id, { name: `Project ${i}` });
      }

      const recentProjects = await ProjectModel.getRecentActivity(testUser.id, 3);

      expect(recentProjects).toHaveLength(3);
    });

    it('should return empty array for user with no projects', async () => {
      const otherUser = await TestHelpers.createTestUser({ 
        email: 'other@example.com', 
        username: 'otheruser' 
      });

      const recentProjects = await ProjectModel.getRecentActivity(otherUser.id, 5);

      expect(recentProjects).toHaveLength(0);
    });
  });

  describe('getUserStats', () => {
    it('should return correct user statistics', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });

      const stats = await ProjectModel.getUserStats(testUser.id);

      expect(stats).toMatchObject({
        total_projects: 2,
        created_today: 2, // Created today in test
        created_this_week: 2,
        created_this_month: 2
      });
    });

    it('should return zero stats for user with no projects', async () => {
      const otherUser = await TestHelpers.createTestUser({ 
        email: 'other@example.com', 
        username: 'otheruser' 
      });

      const stats = await ProjectModel.getUserStats(otherUser.id);

      expect(stats).toMatchObject({
        total_projects: 0,
        created_today: 0,
        created_this_week: 0,
        created_this_month: 0
      });
    });
  });
});
