-- =====================================================
-- VERIFY AUDIT LOGS - Diagnostic Script
-- =====================================================
-- Run this in Supabase SQL Editor to check audit logs table

-- 1. Check if audit_logs table exists
SELECT 
    'audit_logs table exists' as check_name,
    EXISTS (
        SELECT  FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
    ) as result;

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- 3. Count total audit logs
SELECT 
    'Total audit logs' as metric,
    COUNT(*) as count
FROM audit_logs;

-- 4. Count by action type
SELECT 
    action_type,
    COUNT(*) as count
FROM audit_logs
GROUP BY action_type
ORDER BY count DESC;

-- 5. Count by actor role
SELECT 
    actor_role,
    COUNT(*) as count
FROM audit_logs
GROUP BY actor_role
ORDER BY count DESC;

-- 6. Show recent audit logs (last 20)
SELECT 
    created_at,
    actor_email,
    actor_role,
    action_type,
    target_type,
    target_name,
    company_id
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- 7. Show logs for a specific company (replace with actual company_id)
-- SELECT 
--     created_at,
--     actor_email,
--     actor_role,
--     action_type,
--     target_type,
--     target_name
-- FROM audit_logs
-- WHERE company_id = 'YOUR_COMPANY_ID_HERE'
-- ORDER BY created_at DESC
-- LIMIT 50;

-- 8. Check if create_audit_log function exists
SELECT 
    'create_audit_log function exists' as check_name,
    EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_audit_log'
        AND n.nspname = 'public'
    ) as result;

-- 9. Check RLS policies on audit_logs table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'audit_logs'
ORDER BY policyname;

-- =====================================================
-- TROUBLESHOOTING TIPS:
-- =====================================================
-- If you see:
-- - Zero audit logs: The logging system hasn't been used yet, or logs are failing silently
-- - Only 'login' actions: Perform other actions (create employee, report incident) to test
-- - Empty results: Function might not be installed, run migration 20260106000000_super_admin_enhancements.sql
-- =====================================================
