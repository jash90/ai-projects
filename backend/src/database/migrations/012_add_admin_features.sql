-- Add admin features to users table
-- This migration adds role, token limits, and admin functionality

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
ADD COLUMN token_limit_global INTEGER,
ADD COLUMN token_limit_monthly INTEGER,
ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing users to have default values
UPDATE users SET 
  role = 'user',
  is_active = true
WHERE role IS NULL OR is_active IS NULL;

-- Create index for role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Create global token limits table for system-wide defaults
CREATE TABLE IF NOT EXISTS global_token_limits (
  id SERIAL PRIMARY KEY,
  limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN ('global', 'monthly')),
  limit_value INTEGER NOT NULL,
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default global limits
INSERT INTO global_token_limits (limit_type, limit_value, updated_by) VALUES
('global', 1000000, 'system'),
('monthly', 100000, 'system')
ON CONFLICT DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to global_token_limits table
CREATE TRIGGER update_global_token_limits_updated_at 
  BEFORE UPDATE ON global_token_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for admin activity queries
CREATE INDEX idx_admin_activity_admin_user ON admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_target_user ON admin_activity_log(target_user_id);
CREATE INDEX idx_admin_activity_created_at ON admin_activity_log(created_at);

-- Add foreign key constraints
ALTER TABLE admin_activity_log 
ADD CONSTRAINT fk_admin_activity_admin_user 
FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create view for user management with usage stats
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
  u.id,
  u.email,
  u.username,
  u.role,
  u.token_limit_global,
  u.token_limit_monthly,
  u.is_active,
  u.created_at,
  u.updated_at,
  COALESCE(SUM(tu.total_tokens), 0) as total_tokens_used,
  COALESCE(SUM(CASE 
    WHEN tu.created_at >= DATE_TRUNC('month', CURRENT_DATE) 
    THEN tu.total_tokens 
    ELSE 0 
  END), 0) as monthly_tokens_used,
  COUNT(DISTINCT p.id) as project_count,
  MAX(tu.created_at) as last_active
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN token_usage tu ON u.id = tu.user_id
GROUP BY u.id, u.email, u.username, u.role, u.token_limit_global, u.token_limit_monthly, u.is_active, u.created_at, u.updated_at;
