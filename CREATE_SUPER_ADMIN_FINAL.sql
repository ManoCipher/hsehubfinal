-- =====================================================
-- CREATE SUPER ADMIN - HANDLES AUTO-CREATE TRIGGER
-- =====================================================
-- Your database has a trigger that auto-creates profiles
-- This script handles that properly
-- =====================================================

-- STEP 1: Clean up any existing hsehub@admin data first
DELETE FROM public.super_admin_pins sp
USING auth.users u
WHERE sp.user_id = u.id AND u.email = 'hsehub@admin';

DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id AND u.email = 'hsehub@admin';

DELETE FROM public.profiles p
USING auth.users u
WHERE p.id = u.id AND u.email = 'hsehub@admin';

DELETE FROM auth.users WHERE email = 'hsehub@admin';

-- Also clean up orphaned data
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_roles WHERE user_id NOT IN (SELECT id FROM auth.users);

-- STEP 2: Create the super admin user
DO $$
DECLARE 
  super_admin_id UUID;
BEGIN
  -- Insert into auth.users (this will trigger auto-profile creation)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    email_change_confirm_status,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'hsehub@admin',
    crypt('superadmin@hsehub', gen_salt('bf')),
    NOW(),
    0,
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HSE HuB Admin"}'::jsonb,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO super_admin_id;

  RAISE NOTICE 'Created auth user with ID: %', super_admin_id;

  -- Use ON CONFLICT for profile (in case trigger already created it)
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (super_admin_id, 'hsehub@admin', 'HSE HuB Admin', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RAISE NOTICE 'Profile set';

  -- Insert super_admin role
  INSERT INTO public.user_roles (user_id, role, company_id, created_at)
  VALUES (super_admin_id, 'super_admin'::app_role, NULL, NOW())
  ON CONFLICT (user_id, role, company_id) DO NOTHING;

  RAISE NOTICE 'Role assigned';

  -- Create PIN table and insert PIN
  CREATE TABLE IF NOT EXISTS public.super_admin_pins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  INSERT INTO public.super_admin_pins (user_id, pin_hash)
  VALUES (super_admin_id, crypt('1234567890', gen_salt('bf')))
  ON CONFLICT (user_id) DO UPDATE SET
    pin_hash = EXCLUDED.pin_hash,
    updated_at = NOW();

  RAISE NOTICE 'PIN stored';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUPER ADMIN CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email:    hsehub@admin';
  RAISE NOTICE 'Password: superadmin@hsehub';
  RAISE NOTICE 'PIN:      1234567890';
  RAISE NOTICE '========================================';

END $$;

-- STEP 3: Verify
SELECT 
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.full_name,
  ur.role,
  ur.company_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';
