-- Migration: Accept Invitation Function
-- This function handles invitation acceptance with proper security
-- It runs with SECURITY DEFINER to bypass RLS for the necessary updates

-- Create the accept_invitation function
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
  SELECT id, company_id, email, role
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
    'role', v_member_record.role
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(TEXT, UUID) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.accept_team_invitation IS 
'Handles team invitation acceptance. Links user to team_member, creates user_roles entry, and marks token as used.';
