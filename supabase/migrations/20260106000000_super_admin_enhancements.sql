-- =====================================================
-- SUPER ADMIN AUDIT LOGS SYSTEM
-- =====================================================
-- This migration creates the audit logging infrastructure
-- for tracking all database actions and super admin activities
-- =====================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'block', 'unblock', etc.
  target_type TEXT NOT NULL, -- 'company', 'user', 'subscription', 'invoice', etc.
  target_id UUID,
  target_name TEXT,
  details JSONB, -- Additional context about the action
  ip_address TEXT,
  user_agent TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type ON public.audit_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs
  FOR SELECT
  USING (
    public.is_platform_super_admin()
  );

-- Only super admins can insert audit logs (via function)
DROP POLICY IF EXISTS "audit_logs_insert_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_super_admin" ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    public.is_platform_super_admin()
    OR
    -- Allow system to insert via triggers
    current_user = 'postgres'
  );

-- =====================================================
-- CREATE AUDIT LOG HELPER FUNCTION
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
  SELECT role INTO v_actor_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

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

-- =====================================================
-- SECURITY EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'failed_login', 'suspicious_activity', 'password_reset', etc.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  severity TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only super admins can view security events
DROP POLICY IF EXISTS "security_events_select_super_admin" ON public.security_events;
CREATE POLICY "security_events_select_super_admin" ON public.security_events
  FOR SELECT
  USING (
    public.is_platform_super_admin()
  );

-- =====================================================
-- SUPPORT TICKETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  category TEXT, -- 'technical', 'billing', 'feature_request', etc.
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Companies can view their own tickets
DROP POLICY IF EXISTS "support_tickets_select_own_company" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_company" ON public.support_tickets
  FOR SELECT
  USING (
    public.is_platform_super_admin()
    OR
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Companies can create tickets
DROP POLICY IF EXISTS "support_tickets_insert_own_company" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own_company" ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Only super admins can update tickets
DROP POLICY IF EXISTS "support_tickets_update_super_admin" ON public.support_tickets;
CREATE POLICY "support_tickets_update_super_admin" ON public.support_tickets
  FOR UPDATE
  USING (
    public.is_platform_super_admin()
  );

-- =====================================================
-- MODIFY COMPANIES TABLE (Add blocking fields)
-- =====================================================
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for blocked companies
CREATE INDEX IF NOT EXISTS idx_companies_is_blocked ON public.companies(is_blocked);

-- =====================================================
-- MODIFY USER_ROLES TABLE (Add login tracking)
-- =====================================================
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_roles_last_login ON public.user_roles(last_login_at DESC);

-- =====================================================
-- CREATE SUBSCRIPTION HISTORY TABLE (for billing tab)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'upgraded', 'downgraded', 'renewed', 'cancelled', 'trial_started', 'trial_ended'
  from_tier TEXT,
  to_tier TEXT,
  from_status TEXT,
  to_status TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_history_company_id ON public.subscription_history(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Super admins and company users can view
DROP POLICY IF EXISTS "subscription_history_select" ON public.subscription_history;
CREATE POLICY "subscription_history_select" ON public.subscription_history
  FOR SELECT
  USING (
    public.is_platform_super_admin()
    OR
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Only super admins can insert
DROP POLICY IF EXISTS "subscription_history_insert" ON public.subscription_history;
CREATE POLICY "subscription_history_insert" ON public.subscription_history
  FOR INSERT
  WITH CHECK (
    public.is_platform_super_admin()
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Audit Logs System created successfully!';
  RAISE NOTICE '✅ Security Events table created';
  RAISE NOTICE '✅ Support Tickets table created';
  RAISE NOTICE '✅ Companies table enhanced with blocking fields';
  RAISE NOTICE '✅ User Roles table enhanced with login tracking';
  RAISE NOTICE '✅ Subscription History table created';
END $$;
