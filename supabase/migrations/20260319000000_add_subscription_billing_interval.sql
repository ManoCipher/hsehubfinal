DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'subscription_billing_interval'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN subscription_billing_interval TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'companies_subscription_billing_interval_check'
      AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_subscription_billing_interval_check
      CHECK (
        subscription_billing_interval IN ('month', 'year')
        OR subscription_billing_interval IS NULL
      );
  END IF;
END $$;

UPDATE public.companies
SET subscription_billing_interval = CASE
  WHEN subscription_start_date IS NOT NULL
       AND subscription_end_date IS NOT NULL
       AND EXTRACT(EPOCH FROM (subscription_end_date - subscription_start_date)) >= (300 * 24 * 60 * 60)
    THEN 'year'
  ELSE 'month'
END
WHERE subscription_billing_interval IS NULL
  AND subscription_start_date IS NOT NULL
  AND subscription_end_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_subscription_billing_interval
  ON public.companies(subscription_billing_interval);
