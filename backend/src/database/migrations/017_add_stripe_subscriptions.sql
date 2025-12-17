-- Migration: Add Stripe Subscription System
-- Description: Creates tables for subscription plans, user subscriptions, and subscription history

-- Subscription plans table (defines available tiers)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  token_limit_monthly INTEGER NOT NULL,
  token_limit_global INTEGER,
  features JSONB DEFAULT '[]',
  max_projects INTEGER,
  max_agents INTEGER,
  max_file_size_mb INTEGER DEFAULT 50,
  priority_support BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Subscription history (for audit trail)
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id),
  event_type VARCHAR(50) NOT NULL,
  from_plan_id UUID REFERENCES subscription_plans(id),
  to_plan_id UUID REFERENCES subscription_plans(id),
  stripe_event_id VARCHAR(255),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);

-- Trigger for updated_at on user_subscriptions
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on subscription_plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add subscription_plan_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan_id UUID REFERENCES subscription_plans(id);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, token_limit_monthly, token_limit_global, max_projects, max_agents, max_file_size_mb, features, sort_order) VALUES
('free', 'Free', 'Perfect for trying out the platform', 0, 0, 50000, 500000, 3, 2, 20,
 '["50K tokens/month", "3 projects", "2 AI agents", "Community support", "Basic file uploads (20MB)"]'::jsonb, 1),
('pro', 'Pro', 'For professionals and small teams', 19.99, 199.99, 500000, 5000000, 20, 10, 50,
 '["500K tokens/month", "20 projects", "10 AI agents", "Priority support", "Advanced AI models", "50MB file uploads"]'::jsonb, 2),
('enterprise', 'Enterprise', 'For organizations with advanced needs', 99.99, 999.99, 5000000, NULL, NULL, NULL, 100,
 '["5M tokens/month", "Unlimited projects", "Unlimited agents", "Dedicated support", "All AI models", "Custom integrations", "100MB file uploads"]'::jsonb, 3)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  token_limit_monthly = EXCLUDED.token_limit_monthly,
  token_limit_global = EXCLUDED.token_limit_global,
  max_projects = EXCLUDED.max_projects,
  max_agents = EXCLUDED.max_agents,
  max_file_size_mb = EXCLUDED.max_file_size_mb,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- Set default free plan for existing users
UPDATE users SET subscription_plan_id = (SELECT id FROM subscription_plans WHERE name = 'free')
WHERE subscription_plan_id IS NULL;

-- Create view for subscription management
CREATE OR REPLACE VIEW user_subscription_view AS
SELECT
  u.id as user_id,
  u.email,
  u.username,
  sp.id as plan_id,
  sp.name as plan_name,
  sp.display_name as plan_display_name,
  sp.token_limit_monthly,
  sp.token_limit_global,
  sp.max_projects,
  sp.max_agents,
  sp.max_file_size_mb,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.status as subscription_status,
  us.billing_cycle,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  us.trial_end,
  COALESCE(us.status, 'active') as effective_status
FROM users u
LEFT JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
LEFT JOIN user_subscriptions us ON u.id = us.user_id;
