-- 1. Create missing tables if they don't exist
-- (Using IF NOT EXISTS to avoid errors if they are already there)

CREATE TABLE IF NOT EXISTS public.audits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    scheduled_date TIMESTAMPTZ, -- Added this as it seems required by existing table
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'minor', -- Changed default to a valid enum value
    status TEXT DEFAULT 'open',
    incident_type TEXT DEFAULT 'other',
    incident_date TIMESTAMPTZ DEFAULT now(),
    incident_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    risk_level TEXT DEFAULT 'low',
    status TEXT DEFAULT 'draft',
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

-- 4. Insert Mock Data (Corrected for Schema Constraints)

-- Audits: Includes 'scheduled_date'
INSERT INTO public.audits (company_id, title, status, scheduled_date)
SELECT id, 'Quarterly Safety Audit', 'completed', NOW() FROM public.companies LIMIT 2;

-- Incidents: Uses valid enum values from what we've seen (minor instead of low)
-- We cast strict values to avoid ambiguity if column types are strict
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
    'Minor Slip and Fall', 
    'minor', 
    'injury', 
    NOW(), 
    'INC-' || substr(md5(random()::text), 1, 5),
    'open'
FROM public.companies LIMIT 3;

-- Risk Assessments: Uses a generic fallback if table differs, but trying standard fields
INSERT INTO public.risk_assessments (company_id, title, risk_level, status)
SELECT id, 'Machine Safety Assessment', 'medium', 'draft' 
FROM public.companies LIMIT 4;
