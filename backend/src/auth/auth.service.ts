import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { RedisClientType } from 'redis';
import { UserModel } from '../models/User';
import { AuthUser, JwtPayload } from '../types';
import logger from '../utils/logger';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: RedisClientType,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await UserModel.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const user = await UserModel.create({
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });

    const tokens = this.generateTokens({ id: user.id, email: user.email, username: user.username });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: true,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await UserModel.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isValidPassword = await UserModel.verifyPassword(dto.password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateTokens({ id: user.id, email: user.email, username: user.username });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      tokens,
    };
  }

  async logout(token: string) {
    await this.revokeToken(token);
    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const jwtSecret = this.configService.get<string>('auth.jwtSecret');
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await UserModel.findById(decoded.user_id);
    if (!user) throw new UnauthorizedException('User not found');

    const payload = { user_id: user.id, email: user.email };
    const expiresIn = this.configService.get<string>('auth.jwtExpiresIn', '7d');
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: expiresIn as StringValue | number });

    return { access_token: accessToken };
  }

  generateTokens(user: AuthUser): { access_token: string; refresh_token: string } {
    const jwtSecret = this.configService.get<string>('auth.jwtSecret');
    const expiresIn = this.configService.get<string>('auth.jwtExpiresIn', '7d');

    const payload = { user_id: user.id, email: user.email };

    const access_token = jwt.sign(payload, jwtSecret, { expiresIn: expiresIn as StringValue | number });
    const refresh_token = jwt.sign(payload, jwtSecret, { expiresIn: '30d' as StringValue });

    return { access_token, refresh_token };
  }

  async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.redis.setEx(`blacklist:${token}`, expiresIn, 'revoked');
        }
      }
    } catch (error) {
      logger.error('Error revoking token:', error);
      throw error;
    }
  }
}
