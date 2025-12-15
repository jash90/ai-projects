import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth';
import { TestHelpers } from '../utils/testHelpers';
import { UserModel } from '../../models/User';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            email: userData.email,
            username: userData.username
          },
          tokens: {
            access_token: expect.any(String),
            refresh_token: expect.any(String)
          }
        }
      });
      expect(response.body.data.user.password_hash).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      TestHelpers.expectValidationError(response, 'email');
    });

    it('should reject weak password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      TestHelpers.expectValidationError(response, 'password');
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'TestPassword123!'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register with same email
      const duplicateData = {
        email: 'test@example.com',
        username: 'testuser2',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject duplicate username', async () => {
      const userData = {
        email: 'test1@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to register with same username
      const duplicateData = {
        email: 'test2@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
    });

    it('should login with email successfully', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username
          },
          tokens: {
            access_token: expect.any(String),
            refresh_token: expect.any(String)
          }
        }
      });
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email });

      TestHelpers.expectValidationError(response, 'password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      tokens = TestHelpers.generateTokens(testUser.id);
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: tokens.refresh_token });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          tokens: {
            access_token: expect.any(String),
            refresh_token: expect.any(String)
          }
        }
      });
      expect(response.body.data.tokens.access_token).not.toBe(tokens.access_token);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refresh_token: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      TestHelpers.expectValidationError(response, 'refresh_token');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      tokens = TestHelpers.generateTokens(testUser.id);
    });

    it('should return current user info', async () => {
      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username
          }
        }
      });
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      TestHelpers.expectAuthError(response);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      TestHelpers.expectAuthError(response);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser: any;
    let tokens: any;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      tokens = TestHelpers.generateTokens(testUser.id);
    });

    it('should update username successfully', async () => {
      const updateData = {
        username: 'newusername'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put('/api/auth/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            id: testUser.id,
            username: updateData.username,
            email: testUser.email
          }
        }
      });
    });

    it('should update password successfully', async () => {
      const updateData = {
        password: 'NewPassword456!'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put('/api/auth/profile')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: updateData.password
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject invalid password format', async () => {
      const updateData = {
        password: 'weak'
      };

      const response = await TestHelpers.authenticatedRequest(app, tokens)
        .put('/api/auth/profile')
        .send(updateData);

      TestHelpers.expectValidationError(response, 'password');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ username: 'newname' });

      TestHelpers.expectAuthError(response);
    });
  });
});
