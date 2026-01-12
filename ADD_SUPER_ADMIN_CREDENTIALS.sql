-- =====================================================
-- ADD SUPER ADMIN CREDENTIALS TO DATABASE
-- =====================================================
-- This script will create the super admin user with credentials:
-- Email: hsehub@admin
-- Password: superadmin@hsehub  
-- PIN: 1234567890
-- =====================================================

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

    -- Insert into profiles table
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

    -- Create super_admin_pins table if it doesn't exist
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

    -- Insert PIN hash
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

    RAISE NOTICE 'Stored super admin PIN securely';

  ELSE
    RAISE NOTICE 'Super admin user already exists with ID: %', super_admin_id;
    
    -- Even if user exists, ensure profile, role, and PIN are set correctly
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

    RAISE NOTICE 'Updated existing super admin credentials';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  ur.role,
  ur.company_id,
  CASE 
    WHEN ur.company_id IS NULL THEN '✅ Platform Super Admin'
    ELSE '⚠️ Company-linked Admin'
  END as admin_type,
  u.created_at
FROM auth.users u
INNER JOIN public.profiles p ON u.id = p.id
INNER JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Email: hsehub@admin';
  RAISE NOTICE '🔑 Password: superadmin@hsehub';
  RAISE NOTICE '🔢 PIN: 1234567890';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now login to the application with these credentials.';
  RAISE NOTICE 'The Super Admin menu will appear automatically after login.';
END $$;
