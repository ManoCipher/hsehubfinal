-- ============================================
-- MAKE APPOINTMENT DATE OPTIONAL IN HEALTH CHECKUPS
-- Changes appointment_date from NOT NULL to nullable
-- ============================================

-- Make appointment_date nullable in health_checkups table
ALTER TABLE public.health_checkups 
ALTER COLUMN appointment_date DROP NOT NULL;

-- Add comment to clarify the field is optional
COMMENT ON COLUMN public.health_checkups.appointment_date IS 'Scheduled appointment date for medical investigation (optional)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Appointment date made optional in health_checkups table!';
    RAISE NOTICE '   - Removed NOT NULL constraint from appointment_date';
    RAISE NOTICE '   - Appointment dates can now be added later';
END $$;
