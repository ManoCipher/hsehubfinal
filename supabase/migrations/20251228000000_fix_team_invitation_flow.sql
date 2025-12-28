-- Migration: Fix team invitation flow to allow proper signup
-- Created: 2025-12-28
-- This migration adds necessary RLS policies for the team invitation flow

-- ============================================
-- 1. Add public read policy for companies when there's a valid invitation
-- ============================================
DROP POLICY IF EXISTS "Public can view company with valid team invitation" ON public.companies;

CREATE POLICY "Public can view company with valid team invitation" ON public.companies
FOR SELECT
USING (
  id IN (
    SELECT tm.company_id
    FROM public.team_members tm
    INNER JOIN public.member_invitation_tokens mit ON mit.team_member_id = tm.id
    WHERE mit.expires_at > NOW() AND mit.used_at IS NULL
  )
);

-- ============================================
-- 2. Allow anyone to insert user_roles (needed during signup)
-- ============================================
DROP POLICY IF EXISTS "Allow insert user_roles during signup" ON public.user_roles;

CREATE POLICY "Allow insert user_roles during signup" ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Allow if the user is inserting their own role
  auth.uid() = user_id
);

-- ============================================
-- 3. Allow team_members update by the user themselves (after they sign up)
-- ============================================
DROP POLICY IF EXISTS "Team members can update their own record" ON public.team_members;

CREATE POLICY "Team members can update their own record" ON public.team_members
FOR UPDATE
USING (
  -- Either the user is updating their own record
  user_id = auth.uid()
  OR
  -- Or they are linking themselves (user_id being set to current user) AND the team member has a valid invitation
  (
    id IN (
      SELECT team_member_id
      FROM public.member_invitation_tokens
      WHERE expires_at > NOW()
    )
  )
);

-- ============================================
-- 4. Allow profiles insert/upsert during signup
-- ============================================
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
);

-- ============================================
-- 5. Update team_members status column to allow 'active' status
-- ============================================
-- Ensure the check constraint allows the statuses we need
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_status_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_status_check 
CHECK (status IN ('pending', 'active', 'inactive'));

-- ============================================
-- 6. Add comment for documentation
-- ============================================
COMMENT ON POLICY "Public can view company with valid team invitation" ON public.companies IS 
'Allows invited team members to view their company info during the signup flow';

COMMENT ON POLICY "Team members can update their own record" ON public.team_members IS 
'Allows team members to update their own record, especially to link user_id after signup';
