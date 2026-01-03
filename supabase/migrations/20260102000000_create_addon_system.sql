-- ============================================
-- ADD-ONS AND ENHANCED SUBSCRIPTION MANAGEMENT SYSTEM
-- Created: 2026-01-02
-- Purpose: Enable Super Admin to manage subscription plans, add-ons, and track company usage
-- ============================================

BEGIN;

-- ============================================
-- 1. ADD-ON DEFINITIONS TABLE
-- Master list of available add-ons
-- ============================================
CREATE TABLE IF NOT EXISTS public.addon_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE, -- e.g., 'extra_storage', 'priority_support'
    description TEXT,
    category TEXT NOT NULL DEFAULT 'feature', -- 'feature', 'support', 'integration', 'storage'
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_one_time DECIMAL(10,2) DEFAULT NULL, -- For one-time purchases
    billing_type TEXT NOT NULL DEFAULT 'recurring', -- 'recurring', 'one_time', 'usage_based'
    config_schema JSONB DEFAULT '{}'::jsonb, -- JSON schema for addon configuration
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. COMPANY ADD-ONS TABLE
-- Track which add-ons each company has purchased
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    addon_id UUID REFERENCES public.addon_definitions(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'pending'
    config JSONB DEFAULT '{}'::jsonb, -- Addon-specific configuration
    quantity INTEGER DEFAULT 1,
    price_paid DECIMAL(10,2),
    billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'yearly', 'one_time'
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(company_id, addon_id)
);

-- ============================================
-- 3. COMPANY USAGE TRACKING TABLE
-- Track resource usage for each company
-- ============================================
CREATE TABLE IF NOT EXISTS public.company_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    metric_type TEXT NOT NULL, -- 'employees', 'storage_bytes', 'documents', 'courses', 'api_calls'
    current_value BIGINT DEFAULT 0,
    limit_value BIGINT, -- NULL means unlimited
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, metric_type)
);

-- ============================================
-- 4. SUBSCRIPTION HISTORY/AUDIT LOG
-- Track all subscription changes
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'renewed', 'addon_added', 'addon_removed'
    from_tier subscription_tier,
    to_tier subscription_tier,
    from_status subscription_status,
    to_status subscription_status,
    addon_id UUID REFERENCES public.addon_definitions(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. INVOICES TABLE
-- Track billing and invoices
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'paid', 'overdue', 'cancelled'
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    notes TEXT,
    line_items JSONB DEFAULT '[]'::jsonb, -- Array of line items
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. ADD COLUMNS TO COMPANIES TABLE
-- Enhanced subscription tracking
-- ============================================
DO $$ 
BEGIN
    -- Add storage tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'storage_used_bytes') THEN
        ALTER TABLE public.companies ADD COLUMN storage_used_bytes BIGINT DEFAULT 0;
    END IF;

    -- Add storage limit
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'storage_limit_bytes') THEN
        ALTER TABLE public.companies ADD COLUMN storage_limit_bytes BIGINT DEFAULT 5368709120; -- 5GB default
    END IF;

    -- Add last activity tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'last_activity_at') THEN
        ALTER TABLE public.companies ADD COLUMN last_activity_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Add billing email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'billing_email') THEN
        ALTER TABLE public.companies ADD COLUMN billing_email TEXT;
    END IF;

    -- Add notes for admin
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.companies ADD COLUMN admin_notes TEXT;
    END IF;

    -- Add trial end date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'trial_ends_at') THEN
        ALTER TABLE public.companies ADD COLUMN trial_ends_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- 7. SEED DEFAULT ADD-ONS
-- ============================================
INSERT INTO public.addon_definitions (name, code, description, category, price_monthly, price_yearly, billing_type, sort_order) 
VALUES 
    ('Extra Storage (50GB)', 'extra_storage_50gb', 'Add 50GB of additional document storage', 'storage', 29.00, 290.00, 'recurring', 1),
    ('Extra Storage (100GB)', 'extra_storage_100gb', 'Add 100GB of additional document storage', 'storage', 49.00, 490.00, 'recurring', 2),
    ('Priority Support', 'priority_support', 'Response time < 4 hours, dedicated support channel', 'support', 49.00, 490.00, 'recurring', 3),
    ('API Access', 'api_access', 'Full REST API access for integrations', 'integration', 99.00, 990.00, 'recurring', 4),
    ('Custom Branding', 'custom_branding', 'White-label the platform with your logo and colors', 'feature', 79.00, 790.00, 'recurring', 5),
    ('SSO Integration', 'sso_integration', 'Single Sign-On with SAML/OAuth providers', 'integration', 149.00, 1490.00, 'recurring', 6),
    ('Additional Users (10)', 'extra_users_10', 'Add 10 additional user seats', 'feature', 39.00, 390.00, 'recurring', 7),
    ('Advanced Analytics', 'advanced_analytics', 'Detailed reports, custom dashboards, data export', 'feature', 59.00, 590.00, 'recurring', 8),
    ('Audit Trail Premium', 'audit_trail_premium', 'Extended audit logs with 2-year retention', 'feature', 29.00, 290.00, 'recurring', 9),
    ('Safety Course Bundle', 'safety_course_bundle', '10 standard safety courses (First Aid, PPE, Fire Safety)', 'feature', 0, 149.00, 'one_time', 10),
    ('QuickStart Setup', 'quickstart_setup', '60-minute remote setup and onboarding session', 'support', 0, 0, 'one_time', 11),
    ('Data Migration', 'data_migration', 'Professional data migration from existing systems', 'support', 0, 0, 'one_time', 12)
ON CONFLICT (code) DO NOTHING;

-- Set one-time prices for specific add-ons
UPDATE public.addon_definitions SET price_one_time = 149.00 WHERE code = 'safety_course_bundle';
UPDATE public.addon_definitions SET price_one_time = 149.00 WHERE code = 'quickstart_setup';
UPDATE public.addon_definitions SET price_one_time = 499.00 WHERE code = 'data_migration';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Addon Definitions (public read, super_admin write)
ALTER TABLE public.addon_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active addons" ON public.addon_definitions;
CREATE POLICY "Anyone can view active addons" ON public.addon_definitions
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage addons" ON public.addon_definitions;
CREATE POLICY "Super admins can manage addons" ON public.addon_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Company Addons
ALTER TABLE public.company_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage company addons" ON public.company_addons;
CREATE POLICY "Super admins can manage company addons" ON public.company_addons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Company admins can view own addons" ON public.company_addons;
CREATE POLICY "Company admins can view own addons" ON public.company_addons
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- Company Usage
ALTER TABLE public.company_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage company usage" ON public.company_usage;
CREATE POLICY "Super admins can manage company usage" ON public.company_usage
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Company admins can view own usage" ON public.company_usage;
CREATE POLICY "Company admins can view own usage" ON public.company_usage
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- Subscription History
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage subscription history" ON public.subscription_history;
CREATE POLICY "Super admins can manage subscription history" ON public.subscription_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Company admins can view own history" ON public.subscription_history;
CREATE POLICY "Company admins can view own history" ON public.subscription_history
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.invoices;
CREATE POLICY "Super admins can manage invoices" ON public.invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Company admins can view own invoices" ON public.invoices;
CREATE POLICY "Company admins can view own invoices" ON public.invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to check if company has a specific addon
CREATE OR REPLACE FUNCTION public.company_has_addon(p_company_id UUID, p_addon_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.company_addons ca
        JOIN public.addon_definitions ad ON ca.addon_id = ad.id
        WHERE ca.company_id = p_company_id 
        AND ad.code = p_addon_code
        AND ca.status = 'active'
        AND (ca.end_date IS NULL OR ca.end_date > now())
    );
END;
$$;

-- Function to get company subscription info with addons
CREATE OR REPLACE FUNCTION public.get_company_subscription_info(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'company_id', c.id,
        'company_name', c.name,
        'subscription_tier', c.subscription_tier,
        'subscription_status', c.subscription_status,
        'max_employees', c.max_employees,
        'storage_used_bytes', c.storage_used_bytes,
        'storage_limit_bytes', c.storage_limit_bytes,
        'subscription_start', c.subscription_start_date,
        'subscription_end', c.subscription_end_date,
        'trial_ends_at', c.trial_ends_at,
        'addons', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', ca.id,
                'addon_code', ad.code,
                'addon_name', ad.name,
                'status', ca.status,
                'quantity', ca.quantity,
                'start_date', ca.start_date,
                'end_date', ca.end_date
            ))
            FROM public.company_addons ca
            JOIN public.addon_definitions ad ON ca.addon_id = ad.id
            WHERE ca.company_id = c.id AND ca.status = 'active'
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public.companies c
    WHERE c.id = p_company_id;
    
    RETURN v_result;
END;
$$;

-- Function to calculate company monthly revenue
CREATE OR REPLACE FUNCTION public.calculate_company_mrr(p_company_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_price DECIMAL(10,2);
    v_addon_price DECIMAL(10,2);
BEGIN
    -- Get base subscription price
    SELECT COALESCE(sp.price_monthly, 0) INTO v_base_price
    FROM public.companies c
    LEFT JOIN public.subscription_packages sp ON c.subscription_tier = sp.tier
    WHERE c.id = p_company_id AND c.subscription_status = 'active';
    
    -- Get addon prices
    SELECT COALESCE(SUM(
        CASE 
            WHEN ca.billing_cycle = 'yearly' THEN ad.price_yearly / 12
            ELSE ad.price_monthly * ca.quantity
        END
    ), 0) INTO v_addon_price
    FROM public.company_addons ca
    JOIN public.addon_definitions ad ON ca.addon_id = ad.id
    WHERE ca.company_id = p_company_id 
    AND ca.status = 'active'
    AND ad.billing_type = 'recurring';
    
    RETURN COALESCE(v_base_price, 0) + COALESCE(v_addon_price, 0);
END;
$$;

-- ============================================
-- 10. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_company_addons_company_id ON public.company_addons(company_id);
CREATE INDEX IF NOT EXISTS idx_company_addons_status ON public.company_addons(status);
CREATE INDEX IF NOT EXISTS idx_company_usage_company_id ON public.company_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_company_id ON public.subscription_history(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

COMMIT;
