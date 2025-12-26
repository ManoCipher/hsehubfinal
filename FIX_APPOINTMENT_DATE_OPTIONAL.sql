-- ============================================
-- QUICK FIX: MAKE APPOINTMENT DATE OPTIONAL
-- Run this SQL directly in Supabase SQL Editor
-- ============================================

-- Make appointment_date nullable in health_checkups table
ALTER TABLE public.health_checkups 
ALTER COLUMN appointment_date DROP NOT NULL;

-- Add comment to clarify the field is optional
COMMENT ON COLUMN public.health_checkups.appointment_date IS 'Scheduled appointment date for medical investigation (optional)';

-- Verify the change
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'health_checkups' 
AND column_name = 'appointment_date';
