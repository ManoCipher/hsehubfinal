-- =====================================================
-- FORCE DELETE ALL SUPER ADMIN DATA AND RECREATE
-- =====================================================
-- This will forcefully delete everything and start fresh
-- =====================================================

-- STEP 1: Force delete from super_admin_pins (if table exists)
DO $$ 
BEGIN
  EXECUTE 'DELETE FROM public.super_admin_pins WHERE TRUE';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'super_admin_pins table does not exist, skipping';
END $$;

-- STEP 2: Find and delete ALL profiles with hsehub@admin email
DELETE FROM public.profiles WHERE email = 'hsehub@admin';

-- STEP 3: Delete user_roles for super_admin
DELETE FROM public.user_roles WHERE role = 'super_admin';

-- STEP 4: Delete from auth.users
DELETE FROM auth.users WHERE email = 'hsehub@admin';

-- STEP 5: Also delete the SPECIFIC orphaned ID from the error message
DELETE FROM public.profiles WHERE id = '39d38e6c-80ec-4231-a999-8b4dc1d69ece';

-- STEP 6: Delete ALL orphaned profiles (any profile without matching auth.users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- STEP 7: Delete ALL orphaned user_roles
DELETE FROM public.user_roles 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- VERIFICATION
SELECT 'Cleanup complete. Checking for remaining orphans...' as status;

SELECT COUNT(*) as remaining_orphaned_profiles
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

SELECT 'If count is 0, you can now create the super admin!' as next_step;
