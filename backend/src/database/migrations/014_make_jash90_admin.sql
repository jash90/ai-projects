-- Make user with username jash90 an admin
-- This migration promotes jash90 to admin role

-- Update the user to admin role if they exist
UPDATE users 
SET 
  role = 'admin',
  token_limit_global = 1000000,
  token_limit_monthly = 100000,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE username = 'jash90';

-- Log the admin promotion (if user exists)
INSERT INTO admin_activity_log (admin_user_id, action_type, target_user_id, details)
SELECT 
  u.id,
  'promote_to_admin',
  u.id,
  '{"username": "jash90", "promoted_via": "migration", "migration_file": "014_make_jash90_admin.sql"}'::jsonb
FROM users u 
WHERE u.username = 'jash90'
AND u.role = 'admin';

-- Verify the update was successful
DO $$
DECLARE
    user_count INTEGER;
    user_email TEXT;
BEGIN
    SELECT COUNT(*), MAX(email) INTO user_count, user_email
    FROM users 
    WHERE username = 'jash90' AND role = 'admin';
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Successfully promoted user jash90 (%) to admin role', user_email;
    ELSE
        RAISE NOTICE 'User jash90 not found or already admin';
    END IF;
END $$;
