-- =====================================================
-- UPDATE EXISTING SUPER ADMIN PASSWORD
-- =====================================================
-- This script updates the password for the existing super admin user
-- Use this when the user already exists but you're getting "invalid login"
-- =====================================================

-- Step 1: Update the password for the existing user
UPDATE auth.users
SET 
  encrypted_password = crypt('superadmin@hsehub', gen_salt('bf')),
  email_confirmed_at = NOW(),  -- Make sure email is confirmed
  updated_at = NOW()
WHERE email = 'hsehub@admin';

-- Step 2: Ensure the profile exists and is correct
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  id,
  'hsehub@admin',
  'HSE HuB Admin',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'hsehub@admin'
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Step 3: Ensure the super_admin role exists
INSERT INTO public.user_roles (user_id, role, company_id, created_at)
SELECT 
  id,
  'super_admin'::app_role,
  NULL,
  NOW()
FROM auth.users
WHERE email = 'hsehub@admin'
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- Step 4: Create/update the PIN
CREATE TABLE IF NOT EXISTS public.super_admin_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.super_admin_pins (user_id, pin_hash)
SELECT 
  id,
  crypt('1234567890', gen_salt('bf'))
FROM auth.users
WHERE email = 'hsehub@admin'
ON CONFLICT (user_id) DO UPDATE
SET 
  pin_hash = EXCLUDED.pin_hash,
  updated_at = NOW();

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT '✅ SUPER ADMIN UPDATE COMPLETE!' as status;

SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  (u.encrypted_password IS NOT NULL) as has_password,
  p.full_name,
  ur.role,
  ur.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';

SELECT '📧 Email: hsehub@admin' as login_credentials
UNION ALL
SELECT '🔑 Password: superadmin@hsehub'
UNION ALL  
SELECT '🔢 PIN: 1234567890'
UNION ALL
SELECT ''
UNION ALL
SELECT '✅ You can now login with these credentials!';
