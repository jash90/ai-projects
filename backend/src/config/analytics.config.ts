import { registerAs } from '@nestjs/config';

export default registerAs('analytics', () => ({
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    debug: process.env.SENTRY_DEBUG === 'true',
    enabled: !!process.env.SENTRY_DSN,
  },
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
    host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
    enabled: process.env.POSTHOG_ENABLED !== 'false' && !!process.env.POSTHOG_API_KEY,
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'bartekziimny90@gmail.com',
    defaultTokenLimitGlobal: parseInt(process.env.DEFAULT_TOKEN_LIMIT_GLOBAL || '1000000', 10),
    defaultTokenLimitMonthly: parseInt(process.env.DEFAULT_TOKEN_LIMIT_MONTHLY || '100000', 10),
  },
}));
