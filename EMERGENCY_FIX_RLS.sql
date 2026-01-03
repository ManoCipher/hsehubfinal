-- =====================================================
-- EMERGENCY FIX: Remove Recursive Policies NOW
-- =====================================================
-- Run this in Supabase SQL Editor immediately!

-- Drop the TWO recursive policies causing the issue
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

-- These policies query user_roles table while evaluating profiles,
-- causing infinite recursion when user_roles policies reference profiles.

-- The remaining non-recursive policies will handle access:
-- - profiles_select_v2: Uses metadata check for super_admin
-- - profiles_manage_own: For own profile access
-- - profiles_insert_registration: For signup

-- Verify no recursion
SELECT 
  policyname,
  CASE 
    WHEN qual LIKE '%user_roles%' AND tablename = 'profiles'
    THEN '⚠️ RECURSIVE - DROP THIS'
    ELSE '✅ Safe'
  END as status
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';

-- After running: Refresh browser, error should be gone!
