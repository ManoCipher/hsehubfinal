-- =====================================================
-- FIX: Audit Log Actor Role for Super Admins
-- =====================================================
-- This migration updates the create_audit_log function to
-- correctly identify platform super admins and assign them
-- the 'super_admin' role in audit logs, instead of defaulting
-- to 'system'.
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_target_name TEXT,
  p_details JSONB DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_email TEXT;
  v_actor_role TEXT;
BEGIN
  -- Get actor details
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  
  -- Check specifically for platform super admin first
  -- This fixes the issue where super admins were getting 'system' role
  -- because they don't have an entry in the user_roles table
  IF public.is_platform_super_admin() THEN
    v_actor_role := 'super_admin';
  ELSE
    -- For regular users, look up their role
    SELECT role INTO v_actor_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    actor_role,
    action_type,
    target_type,
    target_id,
    target_name,
    details,
    company_id,
    created_at
  )
  VALUES (
    auth.uid(),
    COALESCE(v_actor_email, 'system'),
    COALESCE(v_actor_role, 'system'),
    p_action_type,
    p_target_type,
    p_target_id,
    p_target_name,
    p_details,
    p_company_id,
    NOW()
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
