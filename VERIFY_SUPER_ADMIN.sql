-- =====================================================
-- VERIFY AND CREATE SUPER ADMIN USER
-- =====================================================
-- Step 1: Check if the user already exists
-- =====================================================

SELECT 
  'Checking for existing super admin user...' as status;

SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'hsehub@admin';

-- =====================================================
-- Step 2: Check user_roles table
-- =====================================================

SELECT 
  'Checking user_roles...' as status;

SELECT 
  ur.user_id,
  ur.role,
  ur.company_id,
  u.email
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin' OR ur.role = 'super_admin';

-- =====================================================
-- Step 3: Check profiles table
-- =====================================================

SELECT 
  'Checking profiles...' as status;

SELECT 
  p.id,
  p.email,
  p.full_name,
  u.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'hsehub@admin' OR u.email = 'hsehub@admin';

-- =====================================================
-- DIAGNOSTIC: Show ALL super admin related data
-- =====================================================

SELECT '==================== DIAGNOSTIC RESULTS ====================' as divider;

SELECT 
  'Total users with hsehub@admin email: ' || COUNT(*)::text as result
FROM auth.users
WHERE email = 'hsehub@admin';

SELECT 
  'Total super_admin roles: ' || COUNT(*)::text as result
FROM public.user_roles
WHERE role = 'super_admin';
