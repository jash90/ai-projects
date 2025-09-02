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
  max: process.env.NODE_ENV === 'development' ? 5000 : 2000, // 5000 requests in dev, 2000 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + config.rate_limit.window_ms);
    next(createRateLimitError(resetTime));
  },
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
  max: 50, // 50 attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res, next) => {
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    next(createRateLimitError(resetTime));
  }
});

// File upload rate limiting
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    next(createRateLimitError(resetTime));
  }
});

// Chat/messaging rate limiting
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 1000 : 300, // 1000 messages per minute in dev, 300 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + 60 * 1000); // 1 minute from now
    next(createRateLimitError(resetTime));
  }
});

// AI request rate limiting (more generous due to longer processing times)
export const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'development' ? 500 : 200, // 500 AI requests per 5 minutes in dev, 200 in prod
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all AI requests
  handler: (req, res, next) => {
    // Instead of sending response directly, throw an error that our error handler can catch
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    next(createRateLimitError(resetTime));
  }
});

// API creation rate limiting (for projects, agents, etc.)
export const creationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 500 : 100, // 500 creations per hour in dev, 100 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    const { createRateLimitError } = require('../utils/errors');
    const resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    next(createRateLimitError(resetTime));
  }
});