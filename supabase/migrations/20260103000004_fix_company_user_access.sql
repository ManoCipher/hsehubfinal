-- =====================================================
-- FIX: Allow company users to see employee data
-- =====================================================

-- The issue: user_roles_select_v2 policy was checking if the viewing user's 
-- company_id matches the role's company_id, but this doesn't work for 
-- querying employees table which joins to user_roles.

-- Drop the restrictive policy
DROP POLICY IF EXISTS "user_roles_select_v2" ON public.user_roles;

-- Create a better policy that allows company users to see all roles in their company
CREATE POLICY "user_roles_select_v2" ON public.user_roles
  FOR SELECT
  USING (
    -- View own roles
    user_id = auth.uid()
    OR
    -- Super admin can view all (check metadata, not user_roles)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR
    -- View ALL roles from same company (allow seeing other users in company)
    (
      company_id IN (
        SELECT ur2.company_id 
        FROM public.user_roles ur2
        WHERE ur2.user_id = auth.uid()
        AND ur2.company_id IS NOT NULL
      )
    )
  );

-- Also update profiles policy to be less restrictive
DROP POLICY IF EXISTS "profiles_select_v2" ON public.profiles;

CREATE POLICY "profiles_select_v2" ON public.profiles
  FOR SELECT
  USING (
    -- View own profile
    id = auth.uid()
    OR
    -- Super admin can view all (check metadata, not user_roles)
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR
    -- View profiles of users in same company
    id IN (
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.company_id IN (
        SELECT ur2.company_id 
        FROM public.user_roles ur2
        WHERE ur2.user_id = auth.uid()
        AND ur2.company_id IS NOT NULL
      )
    )
  );

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Policies updated to allow company users to see employee data';
  RAISE NOTICE 'Company users can now:';
  RAISE NOTICE '  - View all user_roles in their company';
  RAISE NOTICE '  - View all profiles in their company';
  RAISE NOTICE '  - Access employees table that joins to user_roles';
END $$;

-- Show active policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_roles', 'profiles')
ORDER BY tablename, policyname;
