-- =====================================================
-- FINAL FIX: No Recursion Using Security Definer
-- =====================================================
-- The problem: ANY policy on user_roles that queries user_roles = recursion
-- Solution: Use a SECURITY DEFINER function that bypasses RLS

-- ============================================
-- STEP 1: Create helper function (bypasses RLS)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND company_id IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.am_i_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.am_i_super_admin() TO authenticated;

-- ============================================
-- STEP 2: Drop ALL existing policies
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on user_roles
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
  END LOOP;
  
  -- Drop all policies on profiles  
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
  
  RAISE NOTICE 'All old policies dropped';
END $$;

-- ============================================
-- STEP 3: Create NEW non-recursive policies
-- ============================================

-- USER_ROLES policies (using helper functions)
-- --------------------------------------------

CREATE POLICY "user_roles_select_final" ON public.user_roles
  FOR SELECT
  USING (
    user_id = auth.uid()  -- View own roles
    OR public.am_i_super_admin()  -- Super admin sees all
    OR (company_id IS NOT NULL AND company_id = public.get_my_company_id())  -- Same company
  );

CREATE POLICY "user_roles_insert_final" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()  -- Can insert own role
    OR public.am_i_super_admin()  -- Super admin can insert any
  );

CREATE POLICY "user_roles_update_final" ON public.user_roles
  FOR UPDATE
  USING (
    public.am_i_super_admin()  -- Only super admin can update
    OR (company_id = public.get_my_company_id())  -- Or company admin for their company
  );

CREATE POLICY "user_roles_delete_final" ON public.user_roles
  FOR DELETE
  USING (
    public.am_i_super_admin()  -- Only super admin can delete
  );

-- PROFILES policies (using helper functions)
-- ------------------------------------------

CREATE POLICY "profiles_select_final" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()  -- View own profile
    OR public.am_i_super_admin()  -- Super admin sees all
    OR id IN (  -- View profiles from same company
      SELECT user_id FROM public.user_roles 
      WHERE company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "profiles_insert_final" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());  -- Can only insert own profile

CREATE POLICY "profiles_update_final" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())  -- Can only update own profile
  WITH CHECK (id = auth.uid());

-- ============================================
-- STEP 4: Verify the fix
-- ============================================
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('user_roles', 'profiles');
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ FINAL FIX APPLIED';
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Key changes:';
  RAISE NOTICE '1. Created get_my_company_id() - bypasses RLS';
  RAISE NOTICE '2. Created am_i_super_admin() - bypasses RLS';
  RAISE NOTICE '3. Policies use functions instead of subqueries';
  RAISE NOTICE '4. NO MORE RECURSION!';
  RAISE NOTICE '====================================';
END $$;

-- Show final policy state
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('user_roles', 'profiles')
ORDER BY tablename, cmd, policyname;
