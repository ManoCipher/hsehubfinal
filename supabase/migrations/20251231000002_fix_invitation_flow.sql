-- Migration: Fix Team Invitation Flow
-- This migration ensures invitation links work for unauthenticated users

-- ============================================
-- 1. FIX RLS POLICIES FOR INVITATION TOKEN LOOKUP
-- ============================================

-- Ensure member_invitation_tokens allows public read for valid tokens
DROP POLICY IF EXISTS "Public can read valid tokens" ON public.member_invitation_tokens;
CREATE POLICY "Public can read valid tokens" ON public.member_invitation_tokens
  FOR SELECT
  USING (true);  -- Allow all reads, validation happens in app logic

-- ============================================
-- 2. FIX RLS POLICIES FOR TEAM_MEMBERS PUBLIC ACCESS
-- ============================================

-- Drop conflicting policies
DROP POLICY IF EXISTS "Public can view team member with valid invitation" ON public.team_members;
DROP POLICY IF EXISTS "anon_can_view_invited_members" ON public.team_members;

-- Create policy for anonymous/public access to team members with valid invitation tokens
-- This uses a subquery to check if the team member has a valid, unexpired, unused token
CREATE POLICY "anon_can_view_invited_members" ON public.team_members
FOR SELECT
USING (
  -- Allow if this team member has a valid invitation token
  id IN (
    SELECT team_member_id
    FROM public.member_invitation_tokens
    WHERE expires_at > NOW()
      AND used_at IS NULL
  )
);

-- ============================================
-- 3. CREATE/UPDATE THE ACCEPT INVITATION FUNCTION
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.accept_team_invitation(TEXT, UUID);

-- Create the accept_invitation function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.accept_team_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_member_record RECORD;
BEGIN
  -- Validate token exists and is not expired/used
  SELECT t.id, t.team_member_id, t.expires_at, t.used_at
  INTO v_token_record
  FROM member_invitation_tokens t
  WHERE t.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token');
  END IF;

  IF v_token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has already been used');
  END IF;

  -- Get member info
  SELECT id, company_id, email, role, first_name, last_name
  INTO v_member_record
  FROM team_members
  WHERE id = v_token_record.team_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team member not found');
  END IF;

  -- Update team member with user_id and status
  UPDATE team_members
  SET 
    user_id = p_user_id,
    status = 'active',
    activated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_token_record.team_member_id;

  -- Create user_roles entry for the new user
  INSERT INTO user_roles (user_id, company_id, role)
  VALUES (p_user_id, v_member_record.company_id, 'employee')
  ON CONFLICT (user_id, company_id) DO UPDATE
  SET role = 'employee';

  -- Mark token as used
  UPDATE member_invitation_tokens
  SET used_at = NOW()
  WHERE token = p_token;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_member_record.company_id,
    'role', v_member_record.role,
    'name', v_member_record.first_name || ' ' || v_member_record.last_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(TEXT, UUID) TO authenticated;

-- ============================================
-- 4. CREATE FUNCTION TO VALIDATE TOKEN (for anon users)
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.validate_invitation_token(TEXT);

-- This function can be called by anonymous users to validate a token
-- and get member information without authentication
CREATE OR REPLACE FUNCTION public.validate_invitation_token(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_member_record RECORD;
BEGIN
  -- Validate token exists
  SELECT t.id, t.team_member_id, t.expires_at, t.used_at
  INTO v_token_record
  FROM member_invitation_tokens t
  WHERE t.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invitation token');
  END IF;

  IF v_token_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation has expired');
  END IF;

  IF v_token_record.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invitation has already been used');
  END IF;

  -- Get member info
  SELECT id, company_id, email, role, first_name, last_name
  INTO v_member_record
  FROM team_members
  WHERE id = v_token_record.team_member_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Team member not found');
  END IF;

  -- Return member info for display
  RETURN jsonb_build_object(
    'valid', true,
    'team_member_id', v_member_record.id,
    'first_name', v_member_record.first_name,
    'last_name', v_member_record.last_name,
    'email', v_member_record.email,
    'role', v_member_record.role,
    'company_id', v_member_record.company_id
  );
END;
$$;

-- Grant execute permission to anonymous users (important!)
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.validate_invitation_token IS 
'Validates an invitation token and returns member info. Can be called anonymously.';

COMMENT ON FUNCTION public.accept_team_invitation IS 
'Handles team invitation acceptance. Links user to team_member, creates user_roles entry, and marks token as used.';
