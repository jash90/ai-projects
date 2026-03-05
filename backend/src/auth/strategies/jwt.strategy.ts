import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { UserModel } from '../../models/User';

// Custom extractor: header first, then cookie
function extractJwtFromRequest(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: RedisClientType,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      secretOrKey: configService.get<string>('auth.jwtSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: { user_id: string; email: string }) {
    // Get the raw token for blacklist check
    const token = extractJwtFromRequest(req);
    if (!token) throw new UnauthorizedException('Access token required');

    // Check Redis blacklist
    const isBlacklisted = await this.redis.get(`blacklist:${token}`);
    if (isBlacklisted) throw new UnauthorizedException('Token has been revoked');

    // Check user exists
    const user = await UserModel.findById(payload.user_id);
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
