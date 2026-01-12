-- =====================================================
-- CREATE SUPER ADMIN USER - FRESH START
-- =====================================================
-- Diagnostic showed user doesn't exist, so we create from scratch
-- =====================================================

-- Step 1: Clean up any orphaned data (just in case)
DO $$
BEGIN
  DELETE FROM public.super_admin_pins WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'hsehub@admin'
  );
  DELETE FROM public.user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'hsehub@admin'
  );
  DELETE FROM public.profiles WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'hsehub@admin'
  );
  DELETE FROM auth.users WHERE email = 'hsehub@admin';
  
  RAISE NOTICE 'Cleaned up any existing data';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Cleanup completed (some tables may not exist)';
END $$;

-- Step 2: Create the super admin user
DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    email_change_confirm_status,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'hsehub@admin',
    crypt('superadmin@hsehub', gen_salt('bf')),
    NOW(),  -- Email confirmed immediately
    0,
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HSE HuB Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO super_admin_id;

  RAISE NOTICE 'Created user in auth.users with ID: %', super_admin_id;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (super_admin_id, 'hsehub@admin', 'HSE HuB Admin', NOW(), NOW());

  RAISE NOTICE 'Created profile';

  -- Assign super_admin role
  INSERT INTO public.user_roles (user_id, role, company_id, created_at)
  VALUES (super_admin_id, 'super_admin'::app_role, NULL, NOW());

  RAISE NOTICE 'Assigned super_admin role';

  -- Create super_admin_pins table if needed
  CREATE TABLE IF NOT EXISTS public.super_admin_pins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.super_admin_pins ENABLE ROW LEVEL SECURITY;

  -- Create RLS policy
  DROP POLICY IF EXISTS "super_admin_pins_select" ON public.super_admin_pins;
  CREATE POLICY "super_admin_pins_select" ON public.super_admin_pins
    FOR SELECT
    USING (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
      )
    );

  -- Store PIN
  INSERT INTO public.super_admin_pins (user_id, pin_hash)
  VALUES (super_admin_id, crypt('1234567890', gen_salt('bf')));

  RAISE NOTICE 'Created PIN';

  -- Success message
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUPER ADMIN CREATED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email:    hsehub@admin';
  RAISE NOTICE '🔑 Password: superadmin@hsehub';
  RAISE NOTICE '🔢 PIN:      1234567890';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login at: http://localhost:8080/auth';
  RAISE NOTICE '';

END $$;

-- Step 3: Verify creation
SELECT 
  '✅ Verification Results:' as status;

SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  u.encrypted_password IS NOT NULL as has_password,
  p.full_name,
  ur.role,
  ur.company_id,
  CASE 
    WHEN ur.company_id IS NULL THEN '✅ Platform Super Admin'
    ELSE '⚠️ Company Admin'
  END as admin_type
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';

-- Check PIN exists
SELECT 
  '✅ PIN configured' as pin_status
FROM public.super_admin_pins sp
JOIN auth.users u ON sp.user_id = u.id
WHERE u.email = 'hsehub@admin';
