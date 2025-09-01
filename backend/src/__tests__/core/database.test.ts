import { TestHelpers } from '../utils/testHelpers';

describe('Database Connection', () => {
  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
  });

  it('should connect to the database', async () => {
    const { pool } = require('../../database/connection');
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  it('should have database configuration', () => {
    const config = require('../../utils/config').default;
    expect(config.database_url).toBeDefined();
    expect(config.jwt_secret).toBeDefined();
  });
});
