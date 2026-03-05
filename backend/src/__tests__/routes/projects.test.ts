import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';

import { ProjectsModule } from '../../projects/projects.module';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { authConfig } from '../../config';
import { TestHelpers } from '../utils/testHelpers';

describe('Projects (NestJS)', () => {
  let app: INestApplication;
  let testUser: any;
  let tokens: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [authConfig],
        }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 900000, limit: 5000 }]),
        DatabaseModule,
        AuthModule,
        ProjectsModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    testUser = await TestHelpers.createTestUser();
    tokens = TestHelpers.generateTokens(testUser.id);
  });

  describe('GET /api/projects', () => {
    it('should return user projects with pagination', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 1' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Project 2' });

      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.totalPages).toBe(1);
    });

    it('should support pagination parameters', async () => {
      for (let i = 1; i <= 5; i++) {
        await TestHelpers.createTestProject(testUser.id, { name: `Project ${i}` });
      }

      const response = await request(app.getHttpServer())
        .get('/api/projects?page=2&limit=2')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(5);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.limit).toBe(2);
      expect(response.body.data.totalPages).toBe(3);
    });

    it('should support search functionality', async () => {
      await TestHelpers.createTestProject(testUser.id, { name: 'React App' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Vue Project' });
      await TestHelpers.createTestProject(testUser.id, { name: 'Angular App' });

      const response = await request(app.getHttpServer())
        .get('/api/projects?search=App')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items.every((p: any) => p.name.includes('App'))).toBe(true);
    });

    it('should only return projects owned by authenticated user', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });

      await TestHelpers.createTestProject(testUser.id, { name: 'My Project' });
      await TestHelpers.createTestProject(otherUser.id, { name: 'Other Project' });

      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].name).toBe('My Project');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new test project',
      };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: projectData.name,
        description: projectData.description,
        user_id: testUser.id,
      });
    });

    it('should create project without description', async () => {
      const projectData = { name: 'Minimal Project' };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe(projectData.name);
    });

    it('should reject missing name', async () => {
      const projectData = { description: 'Project without name' };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(projectData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject name too long', async () => {
      const projectData = { name: 'x'.repeat(201) };

      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(projectData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await TestHelpers.createTestProject(testUser.id);
    });

    it('should return project details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testProject.id,
        name: testProject.name,
        user_id: testUser.id,
      });
    });

    it('should return 404 for other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await request(app.getHttpServer())
        .get(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`);

      expect(response.status).toBe(401);
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
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testProject.id,
        name: updateData.name,
        description: updateData.description,
        user_id: testUser.id,
      });
    });

    it('should update only provided fields', async () => {
      const updateData = { name: 'New Name Only' };

      const response = await request(app.getHttpServer())
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(testProject.description);
    });

    it('should return 404 for other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await request(app.getHttpServer())
        .put(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send({ name: 'Hacked Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.access_token}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/projects/${testProject.id}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await TestHelpers.createTestProject(testUser.id);
    });

    it('should delete project successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(200);

      // Verify project is deleted
      const getResponse = await request(app.getHttpServer())
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when trying to delete other user project', async () => {
      const otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser',
      });
      const otherProject = await TestHelpers.createTestProject(otherUser.id);

      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.access_token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/projects/${testProject.id}`);

      expect(response.status).toBe(401);
    });
  });
});
