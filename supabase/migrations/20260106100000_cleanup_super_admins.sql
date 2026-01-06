-- Migration: Cleanup Super Admin Accounts
-- Only keep hsehub@admin as the super admin

BEGIN;

-- First, let's see what we have
DO $$
DECLARE
    admin_count INTEGER;
    correct_admin_exists BOOLEAN;
BEGIN
    -- Count total super admins
    SELECT COUNT(*) INTO admin_count
    FROM user_roles
    WHERE role = 'super_admin';
    
    RAISE NOTICE 'Found % super admin accounts', admin_count;
    
    -- Check if the correct admin exists
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles ur
        JOIN profiles p ON p.id = ur.user_id
        WHERE ur.role = 'super_admin' 
        AND p.email = 'hsehub@admin'
    ) INTO correct_admin_exists;
    
    IF correct_admin_exists THEN
        RAISE NOTICE 'Correct super admin (hsehub@admin) exists';
    ELSE
        RAISE NOTICE 'WARNING: Correct super admin (hsehub@admin) does NOT exist!';
    END IF;
END $$;

-- Delete all super admin roles EXCEPT the one with email 'hsehub@admin'
DELETE FROM user_roles
WHERE role = 'super_admin'
AND user_id NOT IN (
    SELECT id FROM profiles WHERE email = 'hsehub@admin'
);

-- Verify the cleanup
DO $$
DECLARE
    remaining_admins INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_admins
    FROM user_roles
    WHERE role = 'super_admin';
    
    RAISE NOTICE 'After cleanup: % super admin account(s) remaining', remaining_admins;
    
    IF remaining_admins != 1 THEN
        RAISE EXCEPTION 'Expected exactly 1 super admin, found %', remaining_admins;
    END IF;
END $$;

-- Show the remaining super admin
SELECT 
    ur.id as role_id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name,
    ur.created_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'super_admin';

COMMIT;
