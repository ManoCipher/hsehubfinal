-- ============================================================
-- Fix invoices RLS policies to allow all company members to
-- view their company's invoices (not just admins).
-- ============================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate cleanly
DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Company admins can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Company members can view own invoices" ON public.invoices;

-- Super admins: full CRUD
CREATE POLICY "Super admins can manage invoices" ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Company members: read their company's invoices
CREATE POLICY "Company members can view own invoices" ON public.invoices
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles
      WHERE user_id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

-- ============================================================
-- Add an index to speed up the company_id lookup
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_company_id
  ON public.invoices (company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON public.invoices (status);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
  ON public.invoices (created_at DESC);

-- ============================================================
-- Helper function: generate invoice number
-- Format: INV-YYYY-NNNN (auto-incrementing per company)
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_count INT;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.invoices
  WHERE company_id = p_company_id
    AND to_char(created_at, 'YYYY') = v_year;

  v_number := 'INV-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  RETURN v_number;
END;
$$;

RAISE NOTICE '✅ Invoices RLS policies updated successfully';
