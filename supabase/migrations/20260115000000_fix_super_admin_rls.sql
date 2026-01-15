-- =====================================================
-- FIX SUPER ADMIN RLS POLICIES
-- =====================================================
-- 1. Allow Super Admins to UPDATE companies (blocking/unblocking)
-- 2. Ensure Super Admins can SELECT all companies
-- =====================================================

-- Enable RLS on companies (should be already, but safety first)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop existing restricted policies if they conflict or are insufficient
DROP POLICY IF EXISTS "companies_update_super_admin" ON public.companies;
DROP POLICY IF EXISTS "companies_select_super_admin" ON public.companies;

-- 1. Allow Super Admin to UPDATE any company
-- Using is_platform_super_admin() from 20260103000000 migration
CREATE POLICY "companies_update_super_admin" ON public.companies
    FOR UPDATE
    USING (
        public.is_platform_super_admin()
        OR
        (
             -- Existing logic for Company Admins updating their own company
             id IN (
                SELECT company_id 
                FROM public.user_roles 
                WHERE user_id = auth.uid() 
                AND role = 'company_admin'
             )
        )
    );

-- 2. Allow Super Admin to SELECT any company
CREATE POLICY "companies_select_super_admin" ON public.companies
    FOR SELECT
    USING (
        public.is_platform_super_admin()
        OR
        (
            -- Existing logic: Users see their own company
            id IN (
                SELECT company_id 
                FROM public.user_roles 
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- AUDIT LOGS FIXES (If any)
-- =====================================================
-- Ensure create_audit_log can be called by anyone (it's SECURITY DEFINER so RLS is bypassed, 
-- but we should ensure the function logic is robust).

-- Re-assert policies for audit_logs just in case
-- Super Admins can SELECT all logs
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_super_admin" ON public.audit_logs
    FOR SELECT
    USING (
        public.is_platform_super_admin()
    );

-- Company Admins/Users SELECT their own company logs (if feature enabled)
DROP POLICY IF EXISTS "audit_logs_select_company" ON public.audit_logs;
CREATE POLICY "audit_logs_select_company" ON public.audit_logs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id 
            FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- Verify function exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_platform_super_admin') THEN
        RAISE EXCEPTION 'Function is_platform_super_admin() is missing! Check previous migrations.';
    END IF;
END $$;
