import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  database_url: process.env.DATABASE_URL || 'postgres://claude_user:claude_password@localhost:5432/claude_projects',
  redis_url: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt_secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '7d',
  upload_path: process.env.UPLOAD_PATH || '/tmp/uploads',
  max_file_size: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  allowed_file_types: (process.env.ALLOWED_FILE_TYPES || '.txt,.md,.json,.js,.ts,.jsx,.tsx,.html,.css,.scss,.sass,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.yaml,.yml,.xml,.sql,.sh,.bash,.dockerfile,.gitignore,.env.example').split(','),
  cors_origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
  rate_limit: {
    window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  ai: {
    openai_api_key: process.env.OPENAI_API_KEY,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
    openrouter_api_key: process.env.OPENROUTER_API_KEY,
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'bartekziimny90@gmail.com',
    default_token_limit_global: parseInt(process.env.DEFAULT_TOKEN_LIMIT_GLOBAL || '1000000', 10), // 1M tokens
    default_token_limit_monthly: parseInt(process.env.DEFAULT_TOKEN_LIMIT_MONTHLY || '100000', 10), // 100K tokens/month
  },
  stripe: {
    mode: (process.env.STRIPE_MODE === 'live' ? 'live' : 'test') as 'test' | 'live',
    secret_key: process.env.STRIPE_MODE === 'live'
      ? (process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY)
      : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
    webhook_secret: process.env.STRIPE_MODE === 'live'
      ? (process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET)
      : (process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET),
    public_key: process.env.STRIPE_MODE === 'live'
      ? (process.env.STRIPE_LIVE_PUBLIC_KEY || process.env.STRIPE_PUBLIC_KEY)
      : (process.env.STRIPE_TEST_PUBLIC_KEY || process.env.STRIPE_PUBLIC_KEY),
  },
  log_level: process.env.LOG_LEVEL || 'info',
};

export default config;