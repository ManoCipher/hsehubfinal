-- =====================================================
-- DIRECT FIX FOR SUPER ADMIN - RUN THIS NOW
-- =====================================================

-- Step 1: Show current state
SELECT 'BEFORE FIX:' as status;
SELECT 
  ur.id,
  u.email,
  ur.role,
  ur.company_id,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin';

-- Step 2: Delete ALL super_admin entries for hsehub@admin
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin')
AND role = 'super_admin';

-- Step 3: Insert exactly ONE super_admin entry
INSERT INTO public.user_roles (user_id, role, company_id, created_at)
SELECT 
  id,
  'super_admin'::app_role,
  NULL,
  NOW()
FROM auth.users 
WHERE email = 'hsehub@admin';

-- Step 4: Verify the fix
SELECT 'AFTER FIX:' as status;
SELECT 
  ur.id,
  u.email,
  ur.role,
  ur.company_id,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin';

-- Step 5: Update get_company_context to handle super_admin properly
CREATE OR REPLACE FUNCTION public.get_company_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get user's role - prioritize super_admin
  SELECT company_id, role INTO v_company_id, v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'company_admin' THEN 2
      ELSE 3
    END
  LIMIT 1;

  -- Super admin - return success even without company
  IF v_role = 'super_admin' THEN
    RETURN jsonb_build_object(
      'success', true,
      'company_id', v_company_id,
      'role', 'super_admin'
    );
  END IF;

  -- For non-super-admin, try to find company
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE created_by = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, company_id, role)
      VALUES (v_user_id, v_company_id, 'company_admin')
      ON CONFLICT DO NOTHING;
      v_role := 'company_admin';
    END IF;
  END IF;

  IF v_company_id IS NULL AND v_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'no_company_linked');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'role', COALESCE(v_role, 'employee')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_context() TO authenticated;

-- Step 6: Test the function (simulating super admin login)
-- This should return role = 'super_admin'
SELECT 'Testing get_company_context for super admin:' as test;

-- Final verification
SELECT 
  'VERIFICATION' as check_type,
  COUNT(*) as super_admin_count,
  CASE WHEN COUNT(*) = 1 THEN '✅ SUCCESS - Exactly 1 entry' 
       ELSE '❌ FAILED - Wrong count' 
  END as status
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'hsehub@admin'
AND ur.role = 'super_admin';

-- =====================================================
-- AFTER RUNNING THIS:
-- 1. Log out from http://localhost:8080
-- 2. Open DevTools (F12) → Application → Storage → Clear site data
-- 3. Close browser completely
-- 4. Open new browser window
-- 5. Go to http://localhost:8080/auth
-- 6. Login: hsehub@admin / superadmin@hsehub
-- 7. Sidebar should show "Super Admin" role!
-- =====================================================
