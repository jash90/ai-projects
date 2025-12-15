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
      // User type doesn't expose password_hash - it's excluded from the returned object
      expect((user as any).password_hash).toBeUndefined();
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

    it('should allow same username for different users', async () => {
      // Note: Username uniqueness is NOT enforced at database level
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

      // This should succeed as username uniqueness is not enforced
      const user = await UserModel.create(duplicateData);
      expect(user.email).toBe(duplicateData.email);
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
      // password_hash should not be returned
      expect((user as any)?.password_hash).toBeUndefined();
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

    it('should match email case-insensitively', async () => {
      // Note: Email lookup is now case-insensitive to prevent duplicate accounts
      const testUser = await TestHelpers.createTestUser({
        email: 'Test@Example.COM'
      });

      // Case-insensitive lookup - different case should now match
      const user = await UserModel.findByEmail('test@example.com');
      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });

      // Exact case should also match
      const exactMatch = await UserModel.findByEmail('Test@Example.COM');
      expect(exactMatch).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });

      // Uppercase variation should match
      const uppercaseMatch = await UserModel.findByEmail('TEST@EXAMPLE.COM');
      expect(uppercaseMatch).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const testUser = await TestHelpers.createTestUser();

      // First get user with password hash
      const userWithHash = await UserModel.findByEmailWithPassword(testUser.email);
      const isValid = await UserModel.verifyPassword(testUser.password, userWithHash!.password_hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const testUser = await TestHelpers.createTestUser();

      const userWithHash = await UserModel.findByEmailWithPassword(testUser.email);
      const isValid = await UserModel.verifyPassword('wrongpassword', userWithHash!.password_hash);

      expect(isValid).toBe(false);
    });
  });

  describe('updateById', () => {
    it('should update user username', async () => {
      const testUser = await TestHelpers.createTestUser();
      const newUsername = 'updateduser';

      const updatedUser = await UserModel.updateById(testUser.id, { username: newUsername });

      expect(updatedUser?.username).toBe(newUsername);
      expect(updatedUser?.email).toBe(testUser.email);
      expect(updatedUser?.updated_at).not.toBe(testUser.updated_at);
    });

    it('should return null for non-existent user', async () => {
      const nonExistentId = uuidv4();

      const updatedUser = await UserModel.updateById(nonExistentId, { username: 'newname' });

      expect(updatedUser).toBeNull();
    });
  });

  describe('deleteById', () => {
    it('should delete user successfully', async () => {
      const testUser = await TestHelpers.createTestUser();

      const deleted = await UserModel.deleteById(testUser.id);

      expect(deleted).toBe(true);

      // Verify user is deleted
      const user = await UserModel.findById(testUser.id);
      expect(user).toBeNull();
    });

    it('should return false for non-existent user', async () => {
      const nonExistentId = uuidv4();

      const deleted = await UserModel.deleteById(nonExistentId);

      expect(deleted).toBe(false);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const testUser = await TestHelpers.createTestUser();

      const exists = await UserModel.emailExists(testUser.email);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent email', async () => {
      const exists = await UserModel.emailExists('nonexistent@example.com');

      expect(exists).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      const testUser = await TestHelpers.createTestUser();

      const exists = await UserModel.usernameExists(testUser.username);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent username', async () => {
      const exists = await UserModel.usernameExists('nonexistentuser');

      expect(exists).toBe(false);
    });
  });
});
