import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { redisClient } from '../utils/redis'
import { Request, Response } from 'express'

// Different rate limits for different operations
export const exportRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:export:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 export requests per windowMs
  message: 'Too many export requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many export requests',
      message: 'You have exceeded the export rate limit. Please wait 15 minutes before trying again.',
      retryAfter: res.getHeader('Retry-After')
    })
  }
})

export const renderRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:render:'
  }),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each user to 60 render requests per minute
  message: 'Too many render requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip
  }
})

export const mermaidRateLimit = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:mermaid:'
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Limit each user to 20 mermaid renders per 5 minutes
  message: 'Too many diagram render requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many diagram render requests',
      message: 'Mermaid diagram rendering is resource-intensive. Please wait before trying again.',
      retryAfter: res.getHeader('Retry-After')
    })
  }
})

// Per-user daily export quota
export const dailyExportQuota = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:daily-export:'
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // Limit each user to 50 exports per day
  message: 'Daily export quota exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Daily export quota exceeded',
      message: 'You have reached your daily export limit of 50 documents. Please try again tomorrow.',
      quotaResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
  }
})