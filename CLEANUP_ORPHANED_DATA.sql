-- =====================================================
-- FIND AND FIX ORPHANED SUPER ADMIN DATA
-- =====================================================
-- The error shows a profile exists but auth.users doesn't
-- Let's find and clean it up
-- =====================================================

-- Step 1: Find orphaned profiles (profiles without auth.users)
SELECT 'FINDING ORPHANED PROFILES...' as step;

SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ ORPHANED (no auth record)'
    ELSE '✅ Has auth record'
  END as status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- Step 2: Find orphaned user_roles
SELECT 'FINDING ORPHANED USER_ROLES...' as step;

SELECT 
  ur.user_id,
  ur.role,
  ur.company_id,
  CASE 
    WHEN u.id IS NULL THEN '❌ ORPHANED (no auth record)'
    ELSE '✅ Has auth record'
  END as status
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE u.id IS NULL AND ur.role = 'super_admin'
LIMIT 10;

-- Step 3: Check if there's a specific ID causing the issue
SELECT 'CHECKING SPECIFIC ID FROM ERROR...' as step;

SELECT 
  p.id,
  p.email,
  p.full_name,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ Profile exists but NO auth.users record'
    ELSE '✅ Both exist'
  END as status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email LIKE '%hsehub%' OR p.email LIKE '%admin%'
   OR p.full_name LIKE '%Admin%' OR p.full_name LIKE '%HSE%';

-- Step 4: DELETE all orphaned super admin data
DO $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete orphaned super_admin_pins
  DELETE FROM public.super_admin_pins 
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned super_admin_pins', deleted_count;

  -- Delete orphaned user_roles with super_admin role
  DELETE FROM public.user_roles 
  WHERE user_id NOT IN (SELECT id FROM auth.users)
  AND role = 'super_admin';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned super_admin user_roles', deleted_count;

  -- Delete ALL orphaned profiles (not just super admin)
  DELETE FROM public.profiles 
  WHERE id NOT IN (SELECT id FROM auth.users);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned profiles', deleted_count;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Cleanup complete! Now you can run CREATE_SUPER_ADMIN_FRESH.sql';
  
END $$;

-- Step 5: Verify cleanup
SELECT 'VERIFICATION: Checking for orphaned data...' as step;

SELECT 
  COUNT(*) as orphaned_profiles
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

SELECT 
  COUNT(*) as orphaned_user_roles
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE u.id IS NULL;

SELECT '✅ If both counts are 0, you can now create the super admin!' as result;
