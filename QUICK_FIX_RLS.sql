-- =====================================================
-- QUICK FIX: Run this in Supabase SQL Editor NOW
-- =====================================================

-- Fix infinite recursion error in Super Admin
DROP POLICY IF EXISTS "user_roles_select_own_company" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_company_users" ON public.user_roles;
DROP POLICY IF EXISTS "profiles_select_company_users" ON public.profiles;

-- Non-recursive policy for user_roles
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR (
      company_id IS NOT NULL
      AND company_id IN (
        SELECT ur2.company_id FROM public.user_roles ur2 
        WHERE ur2.user_id = auth.uid() AND ur2.company_id IS NOT NULL
        LIMIT 1
      )
    )
  );

-- Non-recursive policy for profiles
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
    OR id IN (
      SELECT ur.user_id FROM public.user_roles ur
      WHERE ur.company_id IN (
        SELECT ur2.company_id FROM public.user_roles ur2 
        WHERE ur2.user_id = auth.uid()
        LIMIT 1
      )
    )
  );

-- After running: Restart app and refresh browser
