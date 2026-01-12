-- 1. Create missing tables if they don't exist
-- (Using IF NOT EXISTS to avoid errors if they are already there)

CREATE TABLE IF NOT EXISTS public.audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'planned',
    scheduled_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'minor',
    status TEXT DEFAULT 'open',
    incident_type TEXT DEFAULT 'other',
    incident_date TIMESTAMPTZ DEFAULT now(),
    incident_number TEXT,
    investigation_status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    risk_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'draft',
    assessment_date TIMESTAMPTZ DEFAULT now(), -- Added to schema creation just in case
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS (Safe to re-run)
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Super Admin (DO block to avoid "policy already exists" error)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'audits' AND policyname = 'Super Admins can view all audits'
    ) THEN
        CREATE POLICY "Super Admins can view all audits" ON public.audits
            FOR SELECT TO authenticated
            USING (
                EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
                OR company_id = (SELECT company_id FROM public.team_members WHERE user_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'incidents' AND policyname = 'Super Admins can view all incidents'
    ) THEN
        CREATE POLICY "Super Admins can view all incidents" ON public.incidents
            FOR SELECT TO authenticated
            USING (
                EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
                OR company_id = (SELECT company_id FROM public.team_members WHERE user_id = auth.uid())
            );
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'risk_assessments' AND policyname = 'Super Admins can view all risk_assessments'
    ) THEN
        CREATE POLICY "Super Admins can view all risk_assessments" ON public.risk_assessments
            FOR SELECT TO authenticated
            USING (
                EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
                OR company_id = (SELECT company_id FROM public.team_members WHERE user_id = auth.uid())
            );
    END IF;
END
$$;

-- 4. POPULATE DATA FOR ALL COMPANIES
-- This ensures that every company has some mock data to show in analytics

-- Insert 1 Audit for every company that doesn't have one
INSERT INTO public.audits (company_id, title, status, scheduled_date)
SELECT id, 'Annual HSE Compliance Audit', 'planned', NOW() + interval '30 days'
FROM public.companies
WHERE NOT EXISTS (SELECT 1 FROM public.audits WHERE company_id = public.companies.id);

-- Insert 1 Incident for every company that doesn't have one
INSERT INTO public.incidents (
    company_id, 
    title, 
    severity, 
    incident_type, 
    incident_date, 
    incident_number,
    investigation_status
)
SELECT 
    id, 
    'Reported Near Miss', 
    'minor', 
    'near_miss', 
    NOW() - interval '2 days', 
    'INC-' || substr(md5(random()::text), 1, 6),
    'closed'
FROM public.companies
WHERE NOT EXISTS (SELECT 1 FROM public.incidents WHERE company_id = public.companies.id);

-- Insert 2 Risk Assessments for every company that doesn't have one
-- ADDED assessment_date to fix NOT NULL constraint
INSERT INTO public.risk_assessments (company_id, title, risk_level, status, assessment_date)
SELECT id, 'Office Ergonomics Assessment', 'low', 'completed', NOW() - interval '5 days'
FROM public.companies
WHERE NOT EXISTS (SELECT 1 FROM public.risk_assessments WHERE company_id = public.companies.id);

INSERT INTO public.risk_assessments (company_id, title, risk_level, status, assessment_date)
SELECT id, 'Fire Safety Assessment', 'medium', 'draft', NOW()
FROM public.companies
WHERE title = 'Office Ergonomics Assessment' 
   OR NOT EXISTS (SELECT 1 FROM public.risk_assessments WHERE company_id = public.companies.id AND title = 'Fire Safety Assessment');
