c-- =====================================================
-- COMPLETE SUPER ADMIN DIAGNOSTIC
-- =====================================================
-- This script will check EVERYTHING related to super admin login

-- 1. Check if user exists in auth.users
SELECT '========== 1. AUTH.USERS TABLE ==========' as section;
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  (encrypted_password IS NOT NULL) as has_password,
  (encrypted_password = crypt('superadmin@hsehub', encrypted_password)) as password_matches,
  raw_app_meta_data,
  raw_user_meta_data
FROM auth.users
WHERE email = 'hsehub@admin';

-- 2. Check profiles table
SELECT '========== 2. PROFILES TABLE ==========' as section;
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  u.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email = 'hsehub@admin' OR u.email = 'hsehub@admin';

-- 3. Check user_roles table
SELECT '========== 3. USER_ROLES TABLE ==========' as section;
SELECT 
  ur.user_id,
  ur.role,
  ur.company_id,
  ur.created_at,
  u.email
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin' OR ur.role = 'super_admin';

-- 4. Check super_admin_pins table (if it exists)
SELECT '========== 4. SUPER_ADMIN_PINS TABLE ==========' as section;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'super_admin_pins'
  ) THEN
    RAISE NOTICE 'super_admin_pins table exists';
  ELSE
    RAISE NOTICE 'super_admin_pins table DOES NOT exist';
  END IF;
END $$;

-- Try to select from it if it exists
SELECT 
  sp.user_id,
  sp.created_at,
  sp.updated_at,
  u.email,
  (sp.pin_hash = crypt('1234567890', sp.pin_hash)) as pin_matches
FROM public.super_admin_pins sp
LEFT JOIN auth.users u ON sp.user_id = u.id
WHERE u.email = 'hsehub@admin';

-- 5. List ALL users in auth.users
SELECT '========== 5. ALL USERS IN AUTH ==========' as section;
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 6. List ALL super_admin roles
SELECT '========== 6. ALL SUPER ADMIN ROLES ==========' as section;
SELECT 
  ur.user_id,
  ur.role,
  ur.company_id,
  u.email,
  u.email_confirmed_at
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'super_admin';

-- 7. Check for the app_role enum
SELECT '========== 7. APP_ROLE ENUM VALUES ==========' as section;
SELECT 
  enumlabel as role
FROM pg_enum
WHERE enumtypid = 'app_role'::regtype
ORDER BY enumlabel;

-- 8. Summary
SELECT '========== 8. SUMMARY ==========' as section;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'hsehub@admin') 
    THEN '✅ User exists in auth.users'
    ELSE '❌ User DOES NOT exist in auth.users'
  END as auth_user_status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users 
      WHERE email = 'hsehub@admin' 
      AND email_confirmed_at IS NOT NULL
    ) 
    THEN '✅ Email is confirmed'
    ELSE '❌ Email is NOT confirmed'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON p.id = u.id WHERE u.email = 'hsehub@admin') 
    THEN '✅ Profile exists'
    ELSE '❌ Profile DOES NOT exist'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles ur 
      JOIN auth.users u ON ur.user_id = u.id 
      WHERE u.email = 'hsehub@admin' 
      AND ur.role = 'super_admin'
    ) 
    THEN '✅ Super admin role assigned'
    ELSE '❌ Super admin role NOT assigned'
  END;
