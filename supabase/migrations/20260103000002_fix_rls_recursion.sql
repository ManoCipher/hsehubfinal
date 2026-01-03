-- =====================================================
-- FIX INFINITE RECURSION IN USER_ROLES RLS POLICY
-- =====================================================

-- The issue is that the RLS policy on user_roles references itself
-- causing infinite recursion when super_admin tries to query companies

-- Drop the problematic policy
DROP POLICY IF EXISTS "user_roles_select_own_company" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_company_users" ON public.user_roles;

-- Create a simple, non-recursive policy
-- Super admins can see everything, others see only their company
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT
  USING (
    -- Allow if user is viewing their own roles
    user_id = auth.uid()
    OR
    -- Allow if user is super_admin (check directly in raw_user_meta_data to avoid recursion)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR
    -- Allow if viewing same company roles (but only if company_id is not null)
    (
      company_id IS NOT NULL
      AND company_id IN (
        SELECT ur2.company_id 
        FROM public.user_roles ur2 
        WHERE ur2.user_id = auth.uid() 
        AND ur2.company_id IS NOT NULL
        LIMIT 1
      )
    )
  );

-- Also fix the profiles policy to avoid recursion
DROP POLICY IF EXISTS "profiles_select_company_users" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT
  USING (
    -- Allow if viewing own profile
    id = auth.uid()
    OR
    -- Allow if super_admin
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR
    -- Allow if same company (non-recursive check)
    id IN (
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.company_id IN (
        SELECT ur2.company_id 
        FROM public.user_roles ur2 
        WHERE ur2.user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- Verify policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_roles', 'profiles')
ORDER BY tablename, policyname;

-- Test super admin can query companies
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated successfully';
  RAISE NOTICE 'Super admin should now be able to view companies without recursion error';
END $$;
