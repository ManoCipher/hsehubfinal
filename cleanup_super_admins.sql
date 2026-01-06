-- Check all super admin accounts
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name,
    ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'super_admin';

-- Delete all super admin roles EXCEPT the one with email 'hsehub@admin'
DELETE FROM user_roles
WHERE role = 'super_admin'
AND user_id NOT IN (
    SELECT id FROM profiles WHERE email = 'hsehub@admin'
);

-- Verify only one super admin remains
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    p.email,
    p.full_name,
    ur.created_at
FROM user_roles ur
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE ur.role = 'super_admin';
