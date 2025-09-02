-- Make specific user an admin
-- This migration promotes bartekziimny90@gmail.com to admin role

-- Update the user to admin role if they exist
UPDATE users 
SET 
  role = 'admin',
  token_limit_global = 1000000,
  token_limit_monthly = 100000,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP
WHERE email = 'bartekziimny90@gmail.com';

-- Log the admin promotion (if user exists)
INSERT INTO admin_activity_log (admin_user_id, action_type, target_user_id, details)
SELECT 
  u.id,
  'promote_to_admin',
  u.id,
  '{"email": "bartekziimny90@gmail.com", "promoted_via": "migration", "migration_file": "013_make_user_admin.sql"}'::jsonb
FROM users u 
WHERE u.email = 'bartekziimny90@gmail.com'
AND u.role = 'admin';

-- Verify the update was successful
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE email = 'bartekziimny90@gmail.com' AND role = 'admin';
    
    IF user_count > 0 THEN
        RAISE NOTICE 'Successfully promoted bartekziimny90@gmail.com to admin role';
    ELSE
        RAISE NOTICE 'User bartekziimny90@gmail.com not found or already admin';
    END IF;
END $$;
