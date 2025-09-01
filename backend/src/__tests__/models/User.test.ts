import { UserModel } from '../../models/User';
import { TestHelpers } from '../utils/testHelpers';
import { v4 as uuidv4 } from 'uuid';

describe('UserModel', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      const user = await UserModel.create(userData);

      expect(user).toMatchObject({
        email: userData.email,
        username: userData.username
      });
      expect(user.id).toBeDefined();
      expect(user.password_hash).toBeUndefined(); // Should not return password hash
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    it('should hash the password', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      await UserModel.create(userData);

      // Verify password is hashed in database
      const { pool } = require('../../database/connection');
      const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [userData.email]);
      expect(result.rows[0].password_hash).not.toBe(userData.password);
      expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash format
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'TestPassword123!'
      };

      await UserModel.create(userData);

      const duplicateData = {
        email: 'test@example.com',
        username: 'testuser2',
        password: 'TestPassword123!'
      };

      await expect(UserModel.create(duplicateData)).rejects.toThrow();
    });

    it('should reject duplicate username', async () => {
      const userData = {
        email: 'test1@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      await UserModel.create(userData);

      const duplicateData = {
        email: 'test2@example.com',
        username: 'testuser',
        password: 'TestPassword123!'
      };

      await expect(UserModel.create(duplicateData)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const user = await UserModel.findById(testUser.id);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
      expect(user?.password_hash).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = uuidv4();
      
      const user = await UserModel.findById(nonExistentId);

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const user = await UserModel.findByEmail(testUser.email);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should return null for non-existent email', async () => {
      const user = await UserModel.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should be case insensitive', async () => {
      const testUser = await TestHelpers.createTestUser({
        email: 'Test@Example.COM'
      });
      
      const user = await UserModel.findByEmail('test@example.com');

      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const user = await UserModel.findByUsername(testUser.username);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should return null for non-existent username', async () => {
      const user = await UserModel.findByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const isValid = await UserModel.validatePassword(testUser.id, testUser.password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const isValid = await UserModel.validatePassword(testUser.id, 'wrongpassword');

      expect(isValid).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const nonExistentId = uuidv4();
      
      const isValid = await UserModel.validatePassword(nonExistentId, 'password');

      expect(isValid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user username', async () => {
      const testUser = await TestHelpers.createTestUser();
      const newUsername = 'updateduser';
      
      const updatedUser = await UserModel.update(testUser.id, { username: newUsername });

      expect(updatedUser?.username).toBe(newUsername);
      expect(updatedUser?.email).toBe(testUser.email);
      expect(updatedUser?.updated_at).not.toBe(testUser.updated_at);
    });

    it('should update user password', async () => {
      const testUser = await TestHelpers.createTestUser();
      const newPassword = 'NewPassword456!';
      
      const updatedUser = await UserModel.update(testUser.id, { password: newPassword });

      expect(updatedUser?.id).toBe(testUser.id);
      
      // Verify new password works
      const isValid = await UserModel.validatePassword(testUser.id, newPassword);
      expect(isValid).toBe(true);
      
      // Verify old password doesn't work
      const isOldValid = await UserModel.validatePassword(testUser.id, testUser.password);
      expect(isOldValid).toBe(false);
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = uuidv4();
      
      const updatedUser = await UserModel.update(nonExistentId, { username: 'newname' });

      expect(updatedUser).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const testUser = await TestHelpers.createTestUser();
      
      const deleted = await UserModel.delete(testUser.id);

      expect(deleted).toBe(true);
      
      // Verify user is deleted
      const user = await UserModel.findById(testUser.id);
      expect(user).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const nonExistentId = uuidv4();
      
      const deleted = await UserModel.delete(nonExistentId);

      expect(deleted).toBe(false);
    });
  });
});
