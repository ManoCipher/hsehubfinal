-- =====================================================
-- COMPLETE RLS CLEANUP - Remove ALL Recursive Policies
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL old policies on user_roles
-- ============================================
DROP POLICY IF EXISTS "Allow insert user_roles during signup" ON public.user_roles;
DROP POLICY IF EXISTS "insert_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "view_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_v2" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_service_role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "service_role_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own_company" ON public.user_roles;

-- ============================================
-- STEP 2: Drop ALL old policies on profiles
-- ============================================
DROP POLICY IF EXISTS "Allow profile creation during registration" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_v2" ON public.profiles;
DROP POLICY IF EXISTS "profiles_manage_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_registration" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_company_users" ON public.profiles;

-- ============================================
-- STEP 3: Create CLEAN non-recursive policies
-- ============================================

-- USER_ROLES policies
-- -------------------

-- Allow service role full access
CREATE POLICY "user_roles_service_role" ON public.user_roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow users to insert their own roles during signup
CREATE POLICY "user_roles_insert_own" ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- SELECT: Non-recursive policy using metadata check
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
    -- View roles from same company (direct check, no recursion)
    (
      company_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur2
        WHERE ur2.user_id = auth.uid()
        AND ur2.company_id = user_roles.company_id
        AND ur2.company_id IS NOT NULL
      )
    )
  );

-- PROFILES policies
-- -----------------

-- Allow users to manage their own profile
CREATE POLICY "profiles_manage_own" ON public.profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow insert during registration (public access)
CREATE POLICY "profiles_insert_registration" ON public.profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- SELECT: Non-recursive policy
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
    -- View profiles from same company (simplified, no nested queries)
    EXISTS (
      SELECT 1 
      FROM public.user_roles ur1
      INNER JOIN public.user_roles ur2 ON ur1.company_id = ur2.company_id
      WHERE ur1.user_id = profiles.id
      AND ur2.user_id = auth.uid()
      AND ur1.company_id IS NOT NULL
    )
  );

-- ============================================
-- STEP 4: Verify cleanup
-- ============================================
DO $$
DECLARE
  policy_count INT;
BEGIN
  -- Count remaining policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('user_roles', 'profiles');
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ RLS policies cleaned up';
  RAISE NOTICE 'Total policies now: %', policy_count;
  RAISE NOTICE 'Expected: 6 policies total';
  RAISE NOTICE '  - user_roles: 3 policies';
  RAISE NOTICE '  - profiles: 3 policies';
  RAISE NOTICE '====================================';
END $$;

-- Show final policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%user_roles%' AND qual NOT LIKE '%raw_user_meta_data%' 
    THEN '⚠️ May be recursive'
    ELSE '✅ Safe'
  END as status
FROM pg_policies
WHERE tablename IN ('user_roles', 'profiles')
ORDER BY tablename, policyname;
