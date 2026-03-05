import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../../auth/auth.module';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { authConfig } from '../../config';
import { TestHelpers } from '../utils/testHelpers';

// Minimal test controller to exercise auth guard and strategy
@Controller('test-auth')
class TestAuthController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  protected(@CurrentUser() user: any) {
    return { user };
  }

  @Public()
  @Get('public')
  publicRoute() {
    return { message: 'public' };
  }
}

describe('Auth Guard & JWT Strategy (NestJS)', () => {
  let app: INestApplication;

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
      ],
      controllers: [TestAuthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanDatabase();
    jest.clearAllMocks();
  });

  describe('JwtAuthGuard + JwtStrategy', () => {
    let testUser: any;
    let validToken: string;

    beforeEach(async () => {
      testUser = await TestHelpers.createTestUser();
      const tokens = TestHelpers.generateTokens(testUser.id);
      validToken = tokens.access_token;
    });

    it('should authenticate valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-auth/protected')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
      });
    });

    it('should reject missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-auth/protected');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-auth/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { user_id: testUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' },
      );

      const response = await request(app.getHttpServer())
        .get('/test-auth/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject token for non-existent user', async () => {
      const nonExistentToken = jwt.sign(
        { user_id: '00000000-0000-0000-0000-000000000000' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' },
      );

      const response = await request(app.getHttpServer())
        .get('/test-auth/protected')
        .set('Authorization', `Bearer ${nonExistentToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('@Public() decorator', () => {
    it('should allow access to public routes without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/test-auth/public');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('public');
    });
  });
});
