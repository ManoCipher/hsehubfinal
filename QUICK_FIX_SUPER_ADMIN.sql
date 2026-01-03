-- =====================================================
-- QUICK FIX FOR SUPER ADMIN LOGIN ISSUE
-- =====================================================
-- Run this in Supabase SQL Editor to fix:
-- 1. Duplicate super admin entries
-- 2. Role detection issue
-- =====================================================

-- Delete duplicate entries (keep only the oldest one by created_at)
DELETE FROM public.user_roles
WHERE id IN (
  SELECT ur.id
  FROM public.user_roles ur
  WHERE ur.role = 'super_admin'
  AND ur.company_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
    AND ur2.role = ur.role
    AND ur2.company_id IS NULL
    AND ur2.created_at < ur.created_at  -- Keep the older one
  )
);

-- Verify there's only one super admin entry now
SELECT 
  u.email,
  ur.role,
  ur.company_id,
  COUNT(*) as entry_count
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin'
GROUP BY u.email, ur.role, ur.company_id;

-- Should show: 1 row with entry_count = 1

-- After running this:
-- 1. Log out from http://localhost:8080
-- 2. Press F12 → Application tab → Clear all storage
-- 3. Close browser completely
-- 4. Open browser and go to http://localhost:8080/auth
-- 5. Login with: hsehub@admin / superadmin@hsehub
-- 6. Should now show "Super Admin" in sidebar!
