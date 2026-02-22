-- ============================================================
-- Fix profile_fields RLS policies
-- Problem: INSERT/UPDATE/DELETE only checked team_members.role
--          for 'Admin' or 'HSE Manager', but company_admin users
--          live in user_roles (not team_members), and custom-role
--          users are granted access via custom_roles.detailed_permissions
--          -> settings.templates_custom_fields = true.
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.profile_fields ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- DROP all existing policies so we start clean
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their company's profile fields"  ON public.profile_fields;
DROP POLICY IF EXISTS "Admins can insert profile fields"               ON public.profile_fields;
DROP POLICY IF EXISTS "Admins can update profile fields"               ON public.profile_fields;
DROP POLICY IF EXISTS "Admins can delete profile fields"               ON public.profile_fields;
DROP POLICY IF EXISTS "profile_fields_select"                          ON public.profile_fields;
DROP POLICY IF EXISTS "profile_fields_insert"                          ON public.profile_fields;
DROP POLICY IF EXISTS "profile_fields_update"                          ON public.profile_fields;
DROP POLICY IF EXISTS "profile_fields_delete"                          ON public.profile_fields;

-- -------------------------------------------------------
-- SELECT: any member of the company can read the field definitions
-- -------------------------------------------------------
CREATE POLICY "profile_fields_select"
  ON public.profile_fields
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

-- -------------------------------------------------------
-- Helper: returns TRUE when the current user may manage
-- profile fields for the given company_id.
-- Grants access when the user is:
--   (a) a company_admin in user_roles, OR
--   (b) a team member with role 'Admin' or 'HSE Manager', OR
--   (c) a team member whose custom role has
--       detailed_permissions -> settings -> templates_custom_fields = true
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_profile_fields(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    -- (a) company_admin via user_roles
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id    = auth.uid()
      AND ur.company_id = p_company_id
      AND ur.role       = 'company_admin'
  )
  OR EXISTS (
    -- (b) team member with a legacy admin role
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id    = auth.uid()
      AND tm.company_id = p_company_id
      AND tm.role       IN ('Admin', 'HSE Manager')
  )
  OR EXISTS (
    -- (c) team member whose custom role grants templates_custom_fields
    SELECT 1
    FROM public.team_members tm
    JOIN public.custom_roles cr
      ON cr.company_id = tm.company_id
     AND cr.role_name  = tm.role
    WHERE tm.user_id    = auth.uid()
      AND tm.company_id = p_company_id
      AND (cr.detailed_permissions -> 'settings' ->> 'templates_custom_fields')::boolean = true
  );
$$;

-- -------------------------------------------------------
-- INSERT
-- -------------------------------------------------------
CREATE POLICY "profile_fields_insert"
  ON public.profile_fields
  FOR INSERT
  WITH CHECK (
    public.can_manage_profile_fields(company_id)
  );

-- -------------------------------------------------------
-- UPDATE
-- -------------------------------------------------------
CREATE POLICY "profile_fields_update"
  ON public.profile_fields
  FOR UPDATE
  USING (
    public.can_manage_profile_fields(company_id)
  );

-- -------------------------------------------------------
-- DELETE
-- -------------------------------------------------------
CREATE POLICY "profile_fields_delete"
  ON public.profile_fields
  FOR DELETE
  USING (
    public.can_manage_profile_fields(company_id)
  );
