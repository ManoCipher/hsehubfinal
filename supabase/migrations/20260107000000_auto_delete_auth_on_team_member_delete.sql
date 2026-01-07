-- Migration: Auto-delete Auth Users when Team Members are Deleted (SAFE VERSION)
-- This ensures orphaned auth accounts don't remain when users are removed from the system
-- Updated to handle foreign key constraints gracefully

-- Create a function to safely delete auth users when team members are deleted
CREATE OR REPLACE FUNCTION public.cleanup_auth_user_on_team_member_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_remaining_memberships INT;
  v_has_companies BOOLEAN;
BEGIN
  -- Store the user_id from the deleted team member
  v_user_id := OLD.user_id;
  
  -- Only proceed if there was a user_id
  IF v_user_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Check if this user has any remaining team memberships
  SELECT COUNT(*)
  INTO v_remaining_memberships
  FROM team_members
  WHERE user_id = v_user_id;
  
  -- Check if user created any companies
  SELECT EXISTS(SELECT 1 FROM companies WHERE created_by = v_user_id)
  INTO v_has_companies;
  
  -- Only delete if no remaining memberships AND no companies
  IF v_remaining_memberships = 0 AND v_has_companies = FALSE THEN
    -- First, clean up user_roles to avoid foreign key issues
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Then delete the auth user
    BEGIN
      DELETE FROM auth.users WHERE id = v_user_id;
      RAISE NOTICE 'Deleted auth user % (no remaining references)', v_user_id;
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE NOTICE 'Cannot delete auth user % (has foreign key references)', v_user_id;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error deleting auth user %: %', v_user_id, SQLERRM;
    END;
  ELSE
    IF v_has_companies THEN
      RAISE NOTICE 'Auth user % not deleted (created companies)', v_user_id;
    ELSE
      RAISE NOTICE 'Auth user % not deleted (has % remaining memberships)', v_user_id, v_remaining_memberships;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create a trigger on team_members table
DROP TRIGGER IF EXISTS trigger_cleanup_auth_on_team_member_delete ON public.team_members;

CREATE TRIGGER trigger_cleanup_auth_on_team_member_delete
  AFTER DELETE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_auth_user_on_team_member_delete();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.cleanup_auth_user_on_team_member_delete() TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_auth_user_on_team_member_delete() TO service_role;

COMMENT ON FUNCTION public.cleanup_auth_user_on_team_member_delete IS 
'Safely deletes a user from auth.users when their last team_member record is deleted. Handles foreign key constraints gracefully.';
