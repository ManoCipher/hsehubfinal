-- Fix for "Access Denied" error in PublicNotes page
-- Allows public read access to team_members if they have a valid invitation token

-- Create index on member_invitation_tokens to make the subquery faster
CREATE INDEX IF NOT EXISTS idx_member_tokens_team_member_expires 
ON public.member_invitation_tokens(team_member_id, expires_at);

-- Drop existing policy if it exists to avoid conflicts (though we expect it not to exist or be different)
DROP POLICY IF EXISTS "Public can view team member with valid invitation" ON public.team_members;

-- Add RLS Policy
CREATE POLICY "Public can view team member with valid invitation" ON public.team_members
FOR SELECT
USING (
  id IN (
    SELECT team_member_id
    FROM public.member_invitation_tokens
    WHERE expires_at > NOW()
  )
);
