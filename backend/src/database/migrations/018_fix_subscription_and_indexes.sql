-- Migration: Fix Subscription Constraints and Add Performance Indexes
-- Description: Remove blocking unique constraint, add webhook idempotency table, add performance indexes

-- ============================================================
-- PART 1: Fix User Subscriptions Constraint
-- ============================================================
-- The UNIQUE(user_id) constraint prevents users from transitioning between plans.
-- Users need to be able to upgrade/downgrade, which requires updating their subscription record.
-- The unique index (idx_user_subscriptions_user_id) is sufficient for lookups.

-- Drop the unique constraint if it exists as a TABLE CONSTRAINT
-- (PostgreSQL names it based on column when defined in CREATE TABLE)
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;

-- Re-create as a UNIQUE INDEX to support ON CONFLICT (user_id) DO UPDATE pattern
-- This allows plan transitions via upsert while ensuring one subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_unique
ON user_subscriptions(user_id);

-- Add composite index for better query performance on subscription status lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status
ON user_subscriptions(user_id, status);

-- ============================================================
-- PART 2: Stripe Webhook Idempotency
-- ============================================================
-- Stripe may send the same webhook multiple times (network issues, retries).
-- This table tracks processed events to prevent duplicate handling.
-- Per Stripe best practices: https://docs.stripe.com/billing/subscriptions/webhooks

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Index for cleanup queries (events older than 7 days can be purged)
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
ON stripe_processed_events(processed_at);

-- Index for analytics by event type
CREATE INDEX IF NOT EXISTS idx_stripe_events_type
ON stripe_processed_events(event_type);

-- ============================================================
-- PART 3: Performance Indexes for Core Tables
-- ============================================================
-- These indexes improve query performance for common operations

-- Projects table: frequently queried by user_id
CREATE INDEX IF NOT EXISTS idx_projects_user_id
ON projects(user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user_created
ON projects(user_id, created_at DESC);

-- NOTE: agents table has NO project_id column - agents are global resources
-- NOTE: conversations table has NO user_id column - access is controlled via project_id

-- Conversations table: frequently queried by project_id
CREATE INDEX IF NOT EXISTS idx_conversations_project_id
ON conversations(project_id);

-- Token usage table: frequently queried for billing reports
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date
ON token_usage(user_id, created_at DESC);

-- NOTE: Cannot use date_trunc in index (not IMMUTABLE). Use idx_token_usage_user_date for monthly queries.

-- Subscription history: add index on created_at for audit queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_created
ON subscription_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription
ON subscription_history(subscription_id);

-- ============================================================
-- PART 4: Cleanup Function for Old Webhook Events
-- ============================================================
-- Optional: Function to clean up old processed events (run periodically)

CREATE OR REPLACE FUNCTION cleanup_old_stripe_events(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stripe_processed_events
  WHERE processed_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example usage (can be run via cron or scheduled job):
-- SELECT cleanup_old_stripe_events(7);
