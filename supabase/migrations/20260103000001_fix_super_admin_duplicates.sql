-- =====================================================
-- FIX SUPER ADMIN DUPLICATES AND ROLE DETECTION
-- =====================================================

-- Step 1: Remove duplicate super_admin entries
-- Keep only the oldest entry for each user
DELETE FROM public.user_roles
WHERE id IN (
  SELECT ur.id
  FROM public.user_roles ur
  WHERE ur.role = 'super_admin'
  AND ur.company_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
    AND ur2.role = ur.role
    AND ur2.company_id IS NULL
    AND ur2.created_at < ur.created_at  -- Keep the older one
  )
);

-- Step 2: Verify unique constraint exists properly
-- Drop and recreate the unique constraint to handle NULLs correctly
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_roles_user_id_role_company_id_key'
  ) THEN
    ALTER TABLE public.user_roles 
    DROP CONSTRAINT user_roles_user_id_role_company_id_key;
  END IF;
END $$;

-- Create a unique index that treats NULL values as equal
-- This prevents duplicate super_admin entries with NULL company_id
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique_role_per_user 
ON public.user_roles (user_id, role, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Step 3: Verify the fix
DO $$
DECLARE
  duplicate_count INT;
  super_admin_count INT;
BEGIN
  -- Check for duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, role, company_id, COUNT(*) as cnt
    FROM public.user_roles
    WHERE role = 'super_admin' AND company_id IS NULL
    GROUP BY user_id, role, company_id
    HAVING COUNT(*) > 1
  ) dups;

  -- Count super admin entries
  SELECT COUNT(*) INTO super_admin_count
  FROM public.user_roles
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin')
  AND role = 'super_admin';

  IF duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate super admin entries found';
  ELSE
    RAISE WARNING '⚠️ Still found % duplicate super admin entries', duplicate_count;
  END IF;

  IF super_admin_count = 1 THEN
    RAISE NOTICE '✅ Exactly 1 super admin role for hsehub@admin';
  ELSE
    RAISE WARNING '⚠️ Found % super admin roles for hsehub@admin (should be 1)', super_admin_count;
  END IF;
END $$;

-- Show final super admin state
SELECT 
  ur.id,
  u.email,
  ur.role,
  ur.company_id,
  ur.created_at,
  'Super Admin Entry' as description
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin'
AND ur.role = 'super_admin'
ORDER BY ur.created_at;

-- Step 4: Update get_company_context function to handle super_admin correctly
CREATE OR REPLACE FUNCTION public.get_company_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get user's company and role (handle super_admin with NULL company_id)
  SELECT company_id, role INTO v_company_id, v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1  -- Prioritize super_admin
      WHEN role = 'company_admin' THEN 2
      ELSE 3
    END,
    created_at ASC
  LIMIT 1;

  -- Super admin doesn't need company_id
  IF v_role = 'super_admin' THEN
    RETURN jsonb_build_object(
      'success', true,
      'company_id', v_company_id,  -- Will be NULL for platform super admin
      'role', v_role
    );
  END IF;

  IF v_company_id IS NULL THEN
    -- Try to auto-link if user created a company (only for non-super-admins)
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE created_by = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      -- Auto-create link
      INSERT INTO public.user_roles (user_id, company_id, role)
      VALUES (v_user_id, v_company_id, COALESCE(v_role, 'company_admin')::app_role)
      ON CONFLICT (user_id, role, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;
      
      v_role := COALESCE(v_role, 'company_admin');
    END IF;
  END IF;

  IF v_company_id IS NULL AND v_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'no_company_linked');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_context() TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Fix applied successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Log out from the application';
  RAISE NOTICE '2. Clear browser cache (F12 → Application → Clear storage)';
  RAISE NOTICE '3. Log back in with: hsehub@admin / superadmin@hsehub';
  RAISE NOTICE '4. Check sidebar - should show "Super Admin" role';
  RAISE NOTICE '====================================';
END $$;
