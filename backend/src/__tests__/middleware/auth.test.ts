import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, validateProjectAccess } from '../../middleware/auth';
import { TestHelpers } from '../utils/testHelpers';

// Mock request/response objects
const mockRequest = (headers: any = {}, params: any = {}, user: any = null) => ({
  headers,
  params,
  user,
  get: (name: string) => headers[name.toLowerCase()]
} as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe('Auth Middleware', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      const tokens = TestHelpers.generateTokens(testUser.id);
      validToken = tokens.access_token;
    });

    it('should authenticate valid token', async () => {
      const req = mockRequest({
        authorization: `Bearer ${validToken}`
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should reject missing authorization header', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', async () => {
      const req = mockRequest({
        authorization: 'InvalidFormat'
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token format'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = mockRequest({
        authorization: `Bearer ${expiredToken}`
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentToken = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const req = mockRequest({
        authorization: `Bearer ${nonExistentToken}`
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle case insensitive bearer token', async () => {
      const req = mockRequest({
        authorization: `bearer ${validToken}` // lowercase 'bearer'
      });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toMatchObject({
        id: testUser.id
      });
    });
  });

  describe('validateProjectAccess', () => {
    let testUser: any;
    let testProject: any;
    let otherUser: any;
    let otherProject: any;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      testProject = await TestHelpers.createTestProject(testUser.id);
      
      otherUser = await TestHelpers.createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      otherProject = await TestHelpers.createTestProject(otherUser.id);
    });

    it('should allow access to own project', async () => {
      const req = mockRequest(
        {},
        { projectId: testProject.id },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.project).toMatchObject({
        id: testProject.id,
        user_id: testUser.id
      });
    });

    it('should deny access to other user project', async () => {
      const req = mockRequest(
        {},
        { projectId: otherProject.id },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent project', async () => {
      const req = mockRequest(
        {},
        { projectId: '00000000-0000-0000-0000-000000000000' },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing projectId parameter', async () => {
      const req = mockRequest(
        {},
        {}, // No projectId
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid UUID format', async () => {
      const req = mockRequest(
        {},
        { projectId: 'invalid-uuid' },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authenticated user', async () => {
      const req = mockRequest(
        {},
        { projectId: testProject.id },
        null // No user
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error by using an invalid project ID format that causes a DB error
      const req = mockRequest(
        {},
        { projectId: testProject.id },
        testUser
      );
      const res = mockResponse();

      // Temporarily break the database connection to simulate an error
      jest.spyOn(require('../../models/Project').ProjectModel, 'findById')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error'
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });
});
