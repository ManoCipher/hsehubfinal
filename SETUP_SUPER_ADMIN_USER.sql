-- =====================================================
-- SETUP SUPER ADMIN USER FOR TESTING
-- =====================================================
-- This script will grant super_admin role to an existing user
-- Run this in your Supabase SQL Editor after you've created a user account

-- OPTION 1: If you know your user's email, use this:
-- Replace 'your-email@example.com' with the email you used to register
INSERT INTO public.user_roles (user_id, role, company_id)
SELECT 
    id,
    'super_admin'::app_role,
    NULL  -- super_admin doesn't need a company_id
FROM auth.users
WHERE email = 'your-email@example.com'  -- CHANGE THIS
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- OPTION 2: If you want to make the FIRST user in the system a super admin:
-- (Only use this if you have one test user)
-- INSERT INTO public.user_roles (user_id, role, company_id)
-- SELECT 
--     id,
--     'super_admin'::app_role,
--     NULL
-- FROM auth.users
-- ORDER BY created_at ASC
-- LIMIT 1
-- ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- VERIFY: Check if super admin role was added
SELECT 
    u.email,
    ur.role,
    ur.company_id,
    ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'super_admin';

-- =====================================================
-- HOW TO TEST LOCALLY:
-- =====================================================
-- 1. First, apply the addon system migration:
--    Run: supabase db push
--    Or execute the file: supabase/migrations/20260102000000_create_addon_system.sql
--
-- 2. Create a user account in your app (if you haven't already):
--    - Go to http://localhost:8080/auth
--    - Register with an email and password
--
-- 3. Run this SQL script in Supabase SQL Editor:
--    - Replace 'your-email@example.com' with your test email
--    - Execute the script
--
-- 4. Log out and log back in to refresh the session
--
-- 5. You should now see "Super Admin" section in the sidebar with:
--    - Dashboard
--    - Companies
--    - Subscriptions
--    - Add-ons
--    - Analytics
--
-- 6. Click on any Super Admin menu item to test the pages
--
-- =====================================================
-- TROUBLESHOOTING:
-- =====================================================
-- If you don't see the Super Admin menu after adding the role:
--
-- 1. Clear browser cache and localStorage:
--    - Open browser DevTools (F12)
--    - Go to Application tab
--    - Clear all storage
--    - Refresh the page
--
-- 2. Check if the role was added correctly:
--    SELECT u.email, ur.role 
--    FROM auth.users u
--    JOIN public.user_roles ur ON u.id = ur.user_id
--    WHERE u.email = 'your-email@example.com';
--
-- 3. Check browser console for errors:
--    - Open DevTools (F12)
--    - Go to Console tab
--    - Look for authentication or authorization errors
--
-- 4. Verify AuthContext is fetching the role correctly:
--    - In browser console, check localStorage for auth data
--    - The userRole should be 'super_admin'
--
-- =====================================================
-- REMOVE SUPER ADMIN ACCESS (if needed):
-- =====================================================
-- DELETE FROM public.user_roles
-- WHERE user_id = (
--     SELECT id FROM auth.users WHERE email = 'your-email@example.com'
-- )
-- AND role = 'super_admin';
