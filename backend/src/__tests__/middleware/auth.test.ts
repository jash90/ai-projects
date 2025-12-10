import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, validateProjectAccess } from '../../middleware/auth';
import { TestHelpers } from '../utils/testHelpers';

// Mock Redis to prevent connection errors
jest.mock('../../database/connection', () => ({
  pool: jest.requireActual('../../database/connection').pool,
  redis: {
    get: jest.fn().mockResolvedValue(null), // Token not blacklisted
    flushAll: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    setEx: jest.fn().mockResolvedValue(undefined),
  },
}));

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

      // When format is "InvalidFormat", split(' ')[1] returns undefined
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access token required'
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
        error: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { user_id: testUser.id },
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
        error: 'Token expired'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentToken = jwt.sign(
        { user_id: '00000000-0000-0000-0000-000000000000' },
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
      // validateProjectAccess sets projectId in params and calls next()
      expect(req.params.projectId).toBe(testProject.id);
    });

    it('should pass projectId to next middleware for any project', async () => {
      // Note: validateProjectAccess only validates projectId presence,
      // actual ownership validation happens in model methods
      const req = mockRequest(
        {},
        { projectId: otherProject.id },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.params.projectId).toBe(otherProject.id);
    });

    it('should pass any projectId format to next middleware', async () => {
      // Note: validateProjectAccess doesn't validate project existence,
      // that's handled by individual route handlers/models
      const req = mockRequest(
        {},
        { projectId: '00000000-0000-0000-0000-000000000000' },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for missing projectId parameter', async () => {
      const req = mockRequest(
        {},
        {}, // No projectId
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Project ID required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass invalid UUID format to next middleware', async () => {
      // Note: UUID validation can happen at the model layer
      const req = mockRequest(
        {},
        { projectId: 'invalid-uuid' },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access with valid user and projectId', async () => {
      const req = mockRequest(
        {},
        { projectId: testProject.id },
        testUser
      );
      const res = mockResponse();

      await validateProjectAccess(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
