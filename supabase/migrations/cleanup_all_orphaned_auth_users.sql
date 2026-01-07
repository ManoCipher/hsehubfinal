-- =====================================================
-- SAFE CLEANUP: Delete Only Truly Orphaned Auth Users
-- =====================================================
-- This script safely deletes auth users who have:
-- 1. NO team_member records
-- 2. NO companies they created
-- 3. NO other references in the system
-- =====================================================

-- Step 1: PREVIEW - See which users are safe to delete
SELECT 
  au.id,
  au.email,
  au.created_at,
  'SAFE TO DELETE' as status,
  'No team memberships, no companies' as reason
FROM auth.users au
WHERE 
  -- No team memberships
  NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.user_id = au.id
  )
  -- Not a company creator
  AND NOT EXISTS (
    SELECT 1 FROM companies c WHERE c.created_by = au.id
  )
  -- Not referenced in user_roles
  AND NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id
  )
ORDER BY au.email;

-- Step 2: DELETE only safe orphaned users
-- Uncomment and run this to delete them
/*
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  WHERE 
    -- No team memberships
    NOT EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.user_id = au.id
    )
    -- Not a company creator
    AND NOT EXISTS (
      SELECT 1 FROM companies c WHERE c.created_by = au.id
    )
    -- Not referenced in user_roles
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id
    )
);
*/

-- Step 3: Verify cleanup
SELECT 
  COUNT(*) as safely_deleted_orphans
FROM auth.users au
WHERE 
  NOT EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id = au.id)
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.created_by = au.id)
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id);
-- Should return 0 after deletion

-- =====================================================
-- DIAGNOSTIC: View all auth users and their references
-- =====================================================
SELECT 
  au.id,
  au.email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM team_members WHERE user_id = au.id) 
    THEN 'Has Team Membership' 
    ELSE 'No Team Membership' 
  END as team_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM companies WHERE created_by = au.id) 
    THEN 'Created Companies' 
    ELSE 'No Companies' 
  END as company_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = au.id) 
    THEN 'Has User Roles' 
    ELSE 'No User Roles' 
  END as role_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM team_members WHERE user_id = au.id)
      AND NOT EXISTS (SELECT 1 FROM companies WHERE created_by = au.id)
      AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = au.id)
    THEN '✅ SAFE TO DELETE'
    ELSE '⚠️ HAS REFERENCES'
  END as deletion_safety
FROM auth.users au
ORDER BY au.email;
