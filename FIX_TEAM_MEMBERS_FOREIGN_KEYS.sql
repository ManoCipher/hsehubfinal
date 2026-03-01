-- Fix foreign keys to reference team_members instead of employees
-- Run this in your Supabase SQL Editor

BEGIN;

-- First, clean up any invalid foreign key references
-- Set line_manager_id to NULL if it references a non-existent team_member
UPDATE public.risk_assessments
SET line_manager_id = NULL
WHERE line_manager_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE id = risk_assessments.line_manager_id
  );

-- Set approved_by to NULL if it references a non-existent team_member  
UPDATE public.risk_assessments
SET approved_by = NULL
WHERE approved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE id = risk_assessments.approved_by
  );

-- Set responsible_person to NULL if it references a non-existent team_member
UPDATE public.risk_assessment_measures
SET responsible_person = NULL
WHERE responsible_person IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE id = risk_assessment_measures.responsible_person
  );

-- Now check what constraints currently exist
DO $$ 
DECLARE
    constraint_exists boolean;
BEGIN
    -- 1. Fix risk_assessments.line_manager_id foreign key
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'risk_assessments_line_manager_id_fkey' 
        AND table_name = 'risk_assessments'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        -- Check if it points to the wrong table
        IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE constraint_name = 'risk_assessments_line_manager_id_fkey'
            AND table_name = 'employees'
        ) THEN
            RAISE NOTICE 'Dropping line_manager_id constraint pointing to employees table';
            ALTER TABLE public.risk_assessments 
            DROP CONSTRAINT risk_assessments_line_manager_id_fkey;
            
            RAISE NOTICE 'Adding line_manager_id constraint pointing to team_members table';
            ALTER TABLE public.risk_assessments
            ADD CONSTRAINT risk_assessments_line_manager_id_fkey 
            FOREIGN KEY (line_manager_id) REFERENCES public.team_members(id) ON DELETE SET NULL;
        ELSE
            RAISE NOTICE 'line_manager_id constraint already points to team_members - skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Adding new line_manager_id constraint pointing to team_members table';
        ALTER TABLE public.risk_assessments
        ADD CONSTRAINT risk_assessments_line_manager_id_fkey 
        FOREIGN KEY (line_manager_id) REFERENCES public.team_members(id) ON DELETE SET NULL;
    END IF;

    -- 2. Fix risk_assessments.approved_by foreign key
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'risk_assessments_approved_by_fkey' 
        AND table_name = 'risk_assessments'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE constraint_name = 'risk_assessments_approved_by_fkey'
            AND table_name = 'employees'
        ) THEN
            RAISE NOTICE 'Dropping approved_by constraint pointing to employees table';
            ALTER TABLE public.risk_assessments 
            DROP CONSTRAINT risk_assessments_approved_by_fkey;
            
            RAISE NOTICE 'Adding approved_by constraint pointing to team_members table';
            ALTER TABLE public.risk_assessments
            ADD CONSTRAINT risk_assessments_approved_by_fkey 
            FOREIGN KEY (approved_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
        ELSE
            RAISE NOTICE 'approved_by constraint already points to team_members - skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Adding new approved_by constraint pointing to team_members table';
        ALTER TABLE public.risk_assessments
        ADD CONSTRAINT risk_assessments_approved_by_fkey 
        FOREIGN KEY (approved_by) REFERENCES public.team_members(id) ON DELETE SET NULL;
    END IF;

    -- 3. Fix risk_assessment_measures.responsible_person foreign key
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'risk_assessment_measures_responsible_person_fkey' 
        AND table_name = 'risk_assessment_measures'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE constraint_name = 'risk_assessment_measures_responsible_person_fkey'
            AND table_name = 'employees'
        ) THEN
            RAISE NOTICE 'Dropping responsible_person constraint pointing to employees table';
            ALTER TABLE public.risk_assessment_measures 
            DROP CONSTRAINT risk_assessment_measures_responsible_person_fkey;
            
            RAISE NOTICE 'Adding responsible_person constraint pointing to team_members table';
            ALTER TABLE public.risk_assessment_measures
            ADD CONSTRAINT risk_assessment_measures_responsible_person_fkey 
            FOREIGN KEY (responsible_person) REFERENCES public.team_members(id) ON DELETE SET NULL;
        ELSE
            RAISE NOTICE 'responsible_person constraint already points to team_members - skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Adding new responsible_person constraint pointing to team_members table';
        ALTER TABLE public.risk_assessment_measures
        ADD CONSTRAINT risk_assessment_measures_responsible_person_fkey 
        FOREIGN KEY (responsible_person) REFERENCES public.team_members(id) ON DELETE SET NULL;
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- Verify the changes
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('risk_assessments', 'risk_assessment_measures')
  AND kcu.column_name IN ('line_manager_id', 'approved_by', 'responsible_person')
ORDER BY tc.table_name;
