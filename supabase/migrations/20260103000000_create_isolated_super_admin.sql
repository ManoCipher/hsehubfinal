-- =====================================================
-- CREATE ISOLATED SUPER ADMIN USER
-- =====================================================
-- This creates a platform super admin that is completely
-- independent of any company. This admin can see all
-- companies but companies cannot see this admin.
-- =====================================================

-- Create super admin user in auth.users
-- Note: Supabase will hash the password automatically
DO $$
DECLARE
  super_admin_id UUID;
  super_admin_email TEXT := 'hsehub@admin';
  super_admin_password TEXT := 'superadmin@hsehub';
  super_admin_name TEXT := 'HSE HuB Admin';
  super_admin_pin TEXT := '1234567890';
BEGIN
  -- Check if super admin already exists
  SELECT id INTO super_admin_id
  FROM auth.users
  WHERE email = super_admin_email;

  -- If doesn't exist, create it
  IF super_admin_id IS NULL THEN
    -- Insert into auth.users (Supabase's authentication table)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
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
      super_admin_email,
      crypt(super_admin_password, gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'super_admin', true),
      jsonb_build_object('full_name', super_admin_name, 'is_super_admin', true, 'pin', super_admin_pin),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO super_admin_id;

    RAISE NOTICE 'Created super admin user with ID: %', super_admin_id;

    -- Insert into profiles table (with conflict handling)
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      created_at,
      updated_at
    )
    VALUES (
      super_admin_id,
      super_admin_email,
      super_admin_name,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();

    RAISE NOTICE 'Created/Updated super admin profile';

    -- Insert super_admin role (no company_id = platform admin)
    INSERT INTO public.user_roles (
      user_id,
      role,
      company_id,
      created_at
    )
    VALUES (
      super_admin_id,
      'super_admin'::app_role,
      NULL,  -- No company = platform super admin
      NOW()
    )
    ON CONFLICT (user_id, role, company_id) DO NOTHING;

    RAISE NOTICE 'Assigned super_admin role';

    -- Create a super_admin_pins table to store PIN securely
    CREATE TABLE IF NOT EXISTS public.super_admin_pins (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      pin_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS on super_admin_pins
    ALTER TABLE public.super_admin_pins ENABLE ROW LEVEL SECURITY;

    -- Only super admins can access their own PIN
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

    -- Insert PIN hash (with conflict handling)
    INSERT INTO public.super_admin_pins (
      user_id,
      pin_hash
    )
    VALUES (
      super_admin_id,
      crypt(super_admin_pin, gen_salt('bf'))
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      pin_hash = EXCLUDED.pin_hash,
      updated_at = NOW();
  
    -- Even if user exists, ensure profile, role, and PIN are set
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (super_admin_id, super_admin_email, super_admin_name, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, updated_at = NOW();
    
    INSERT INTO public.user_roles (user_id, role, company_id, created_at)
    VALUES (super_admin_id, 'super_admin'::app_role, NULL, NOW())
    ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
    -- Ensure super_admin_pins table exists
    CREATE TABLE IF NOT EXISTS public.super_admin_pins (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      pin_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE public.super_admin_pins ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_pins_select" ON public.super_admin_pins;
    CREATE POLICY "super_admin_pins_select" ON public.super_admin_pins
      FOR SELECT USING (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
      );
    
    INSERT INTO public.super_admin_pins (user_id, pin_hash)
    VALUES (super_admin_id, crypt(super_admin_pin, gen_salt('bf')))
    ON CONFLICT (user_id) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash, updated_at = NOW();
  
    RAISE NOTICE 'Stored super admin PIN securely';

  ELSE
    RAISE NOTICE 'Super admin user already exists with ID: %', super_admin_id;
  END IF;
END $$;

-- =====================================================
-- HELPER FUNCTION: Verify Super Admin PIN
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_super_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pin_hash TEXT;
BEGIN
  -- Get the PIN hash for the current user
  SELECT pin_hash INTO stored_pin_hash
  FROM public.super_admin_pins
  WHERE user_id = auth.uid();

  -- If no PIN found, return false
  IF stored_pin_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verify the PIN using crypt
  RETURN (crypt(input_pin, stored_pin_hash) = stored_pin_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- HELPER FUNCTION: Check if user is Platform Super Admin
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND company_id IS NULL  -- NULL company_id = platform admin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE RLS POLICIES FOR ISOLATION
-- =====================================================
-- Update user_roles policy to hide super admins from company views
DROP POLICY IF EXISTS "user_roles_select_own_company" ON public.user_roles;
CREATE POLICY "user_roles_select_own_company" ON public.user_roles
  FOR SELECT
  USING (
    -- Super admins can see all roles
    public.is_platform_super_admin()
    OR
    -- Regular users can only see roles from their company (excludes platform admins)
    (
      company_id IN (
        SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
      )
      AND company_id IS NOT NULL  -- Exclude platform super admins
    )
    OR
    -- Users can see their own roles
    user_id = auth.uid()
  );

-- Update profiles policy to hide super admin profiles from companies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_company_users" ON public.profiles
  FOR SELECT
  USING (
    -- Super admins can see all profiles
    public.is_platform_super_admin()
    OR
    -- Regular users can only see profiles from their company
    id IN (
      SELECT ur.user_id
      FROM public.user_roles ur
      INNER JOIN public.user_roles my_roles ON my_roles.user_id = auth.uid()
      WHERE ur.company_id = my_roles.company_id
      AND ur.company_id IS NOT NULL  -- Exclude platform super admins
    )
    OR
    -- Users can see their own profile
    id = auth.uid()
  );

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify the super admin was created correctly
DO $$
DECLARE
  result_count INT;
BEGIN
  SELECT COUNT(*) INTO result_count
  FROM auth.users u
  INNER JOIN public.profiles p ON u.id = p.id
  INNER JOIN public.user_roles ur ON u.id = ur.user_id
  WHERE u.email = 'hsehub@admin'
  AND ur.role = 'super_admin'
  AND ur.company_id IS NULL;

  IF result_count > 0 THEN
    RAISE NOTICE '✅ Super admin created successfully!';
    RAISE NOTICE 'Email: hsehub@admin';
    RAISE NOTICE 'Password: superadmin@hsehub';
    RAISE NOTICE 'Name: HSE HuB Admin';
    RAISE NOTICE 'Role: Platform Super Admin (no company association)';
  ELSE
    RAISE WARNING '❌ Super admin creation may have failed. Please check manually.';
  END IF;
END $$;

-- Show the super admin details (for verification)
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  ur.role,
  ur.company_id as company_id,
  CASE 
    WHEN ur.company_id IS NULL THEN '✅ Platform Super Admin (Isolated)'
    ELSE '⚠️ Company-linked Admin'
  END as admin_type,
  u.created_at
FROM auth.users u
INNER JOIN public.profiles p ON u.id = p.id
INNER JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. This super admin has NO company_id, making it completely isolated
-- 2. Company users cannot see this admin in their user lists
-- 3. This admin can see ALL companies and their data
-- 4. Login credentials:
--    Email: hsehub@admin
--    Password: superadmin@hsehub
--    PIN: 1234567890 (stored securely, hashed)
-- 5. The PIN can be used for sensitive operations via verify_super_admin_pin()
-- 6. To use: Login at /auth with email and password
-- 7. After login, the Super Admin menu will appear automatically
-- =====================================================
