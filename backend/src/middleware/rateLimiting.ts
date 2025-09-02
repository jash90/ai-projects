import rateLimit from 'express-rate-limit';
import { redis } from '../database/connection';
import config from '../utils/config';
import logger from '../utils/logger';

// Create a Redis store for rate limiting
class RedisStore {
  private prefix: string;

  constructor(prefix = 'rate-limit:') {
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const redisKey = `${this.prefix}${key}`;
    const windowMs = config.rate_limit.window_ms;
    const maxRequests = config.rate_limit.max_requests;

    try {
      const multi = redis.multi();
      multi.incr(redisKey);
      multi.expire(redisKey, Math.ceil(windowMs / 1000));
      const results = await multi.exec();

      const totalHits = results?.[0]?.[1] as number || 1;
      const resetTime = new Date(Date.now() + windowMs);

      return { totalHits, resetTime };
    } catch (error) {
      logger.error('Redis rate limiting error:', error);
      // Fallback to allowing the request if Redis fails
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await redis.decr(redisKey);
    } catch (error) {
      logger.error('Redis rate limiting decrement error:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const redisKey = `${this.prefix}${key}`;
      await redis.del(redisKey);
    } catch (error) {
      logger.error('Redis rate limiting reset error:', error);
    }
  }
}

// General rate limiting
export const generalLimiter = rateLimit({
  windowMs: config.rate_limit.window_ms, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 2000 : 500, // 2000 requests in dev, 500 in prod
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Simple memory-based rate limiting for now
  // store: new (class implements rateLimit.Store {
  //   private redisStore = new RedisStore('general:');

  //   async increment(key: string): Promise<rateLimit.IncrementResponse> {
  //     const result = await this.redisStore.increment(key);
  //     return result;
  //   }

  //   async decrement(key: string): Promise<void> {
  //     await this.redisStore.decrement(key);
  //   }

  //   async resetKey(key: string): Promise<void> {
  //     await this.redisStore.resetKey(key);
  //   }
  // })(),
});

// Authentication specific rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    success: false,
    error: 'Too many file uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat/messaging rate limiting
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 500 : 60, // 500 messages per minute in dev, 60 in prod
  message: {
    success: false,
    error: 'Too many messages, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI request rate limiting (more generous due to longer processing times)
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 200 : 50, // 200 AI requests per 5 minutes in dev, 50 in prod
  message: {
    success: false,
    error: 'AI request limit reached, please wait before making more requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all AI requests
});

// API creation rate limiting (for projects, agents, etc.)
export const creationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // 100 creations per hour in dev, 20 in prod
  message: {
    success: false,
    error: 'Too many creation requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});