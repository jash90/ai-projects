import request from 'supertest';
import express from 'express';
import cors from 'cors';
import projectRoutes from '../../routes/projects';
import { authenticateToken } from '../../middleware/auth';
import { TestHelpers } from '../utils/testHelpers';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/projects', projectRoutes);

describe('Project Routes', () => {
  let testUser: any;
  let tokens: any;

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
    tokens = TestHelpers.generateTokens(testUser.id);
  });

  describe('GET /api/projects', () => {
    it('should return user projects with pagination', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.arrayContaining([
            expect.objectContaining({ name: 'Project 1' }),
            expect.objectContaining({ name: 'Project 2' })
          ]),
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('should support pagination parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        await TestHelpers.createTestProject(testUser.id, { name: `Project ${i}` });
      }

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects?page=2&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        projects: expect.any(Array),
        total: 5,
        page: 2,
        limit: 2,
        totalPages: 3
      });
      expect(response.body.data.projects).toHaveLength(2);
    });

    it('should support search functionality', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'React App' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Vue Project' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Angular App' });

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects?search=App');

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data.projects.every((p: any) => p.name.includes('App'))).toBe(true);
    });

    it('should only return projects owned by authenticated user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });

      await TestHelpers.createTestProject(testUser.id, { name: 'My Project' });
      await TestHelpers.createTestProject(otherUser.id, { name: 'Other Project' });

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects');

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].name).toBe('My Project');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/projects');

      TestHelpers.expectAuthError(response);
    });
  });

  describe('GET /api/projects/recent', () => {
    it('should return recent projects', async () => {
      const project1 = await TestHelpers.createTestProject(testUser.id, { name: 'Old Project' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const project2 = await TestHelpers.createTestProject(testUser.id, { name: 'Recent Project' });

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects/recent');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          projects: expect.any(Array)
        }
      });
      expect(response.body.data.projects[0].id).toBe(project2.id); // Most recent first
    });

    it('should limit results correctly', async () => {
      for (let i = 1; i <= 10; i++) {
        await TestHelpers.createTestProject(testUser.id, { name: `Project ${i}` });
      }

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects/recent?limit=3');

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toHaveLength(3);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/projects/recent');

      TestHelpers.expectAuthError(response);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new test project'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          project: {
            name: projectData.name,
            description: projectData.description,
            user_id: testUser.id
          }
        }
      });
    });

    it('should create project without description', async () => {
      const projectData = {
        name: 'Minimal Project'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.data.project.name).toBe(projectData.name);
      expect(response.body.data.project.description).toBeNull();
    });

    it('should reject missing name', async () => {
      const projectData = {
        description: 'Project without name'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .post('/api/projects')
        .send(projectData);

      TestHelpers.expectValidationError(response, 'name');
    });

    it('should reject name too long', async () => {
      const projectData = {
        name: 'x'.repeat(201) // Exceeds 200 character limit
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .post('/api/projects')
        .send(projectData);

      TestHelpers.expectValidationError(response, 'name');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' });

      TestHelpers.expectAuthError(response);
    });
  });

  describe('GET /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await TestHelpers.createTestProject(testUser.id);
    });

    it('should return project details', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get(`/api/projects/${testProject.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          project: {
            id: testProject.id,
            name: testProject.name,
            description: testProject.description,
            user_id: testUser.id
          }
        }
      });
    });

    it('should reject access to other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get(`/api/projects/${otherProject.id}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get(`/api/projects/00000000-0000-0000-0000-000000000000`);

      TestHelpers.expectNotFoundError(response);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`);

      TestHelpers.expectAuthError(response);
    });
  });

  describe('PUT /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await TestHelpers.createTestProject(testUser.id);
    });

    it('should update project successfully', async () => {
      const updateData = {
        name: 'Updated Project',
        description: 'Updated description'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put(`/api/projects/${testProject.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          project: {
            id: testProject.id,
            name: updateData.name,
            description: updateData.description,
            user_id: testUser.id
          }
        }
      });
    });

    it('should update only provided fields', async () => {
      const updateData = {
        name: 'New Name Only'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put(`/api/projects/${testProject.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.project.name).toBe(updateData.name);
      expect(response.body.data.project.description).toBe(testProject.description);
    });

    it('should reject access to other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put(`/api/projects/${otherProject.id}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put(`/api/projects/00000000-0000-0000-0000-000000000000`)
        .send({ name: 'New Name' });

      TestHelpers.expectNotFoundError(response);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .send({ name: 'New Name' });

      TestHelpers.expectAuthError(response);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await TestHelpers.createTestProject(testUser.id);
    });

    it('should delete project successfully', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .delete(`/api/projects/${testProject.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Project deleted successfully'
        }
      });

      // Verify project is deleted
      const getResponse = await TestHelpers.authenticatedRequest(app, tokens)
        .get(`/api/projects/${testProject.id}`);
      
      TestHelpers.expectNotFoundError(getResponse);
    });

    it('should reject access to other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .delete(`/api/projects/${otherProject.id}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 404 for non-existent project', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .delete(`/api/projects/00000000-0000-0000-0000-000000000000`);

      TestHelpers.expectNotFoundError(response);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject.id}`);

      TestHelpers.expectAuthError(response);
    });
  });

  describe('GET /api/projects/stats', () => {
    it('should return user project statistics', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects/stats');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          stats: {
            total_projects: 2,
            created_today: expect.any(Number),
            created_this_week: expect.any(Number),
            created_this_month: expect.any(Number)
          }
        }
      });
    });

    it('should return zero stats for user with no projects', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/projects/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.stats).toMatchObject({
        total_projects: 0,
        created_today: 0,
        created_this_week: 0,
        created_this_month: 0
      });
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/projects/stats');

      TestHelpers.expectAuthError(response);
    });
  });
});
