-- =====================================================
-- FIX SUPER ADMIN PIN
-- =====================================================
-- The login worked but PIN verification is failing
-- This script ensures the PIN is properly set up
-- =====================================================

-- Step 1: Create the super_admin_pins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.super_admin_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE public.super_admin_pins ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policy for selecting PIN (needed for verification)
DROP POLICY IF EXISTS "super_admin_pins_select" ON public.super_admin_pins;
CREATE POLICY "super_admin_pins_select" ON public.super_admin_pins
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Step 4: Insert/Update the PIN for the super admin
INSERT INTO public.super_admin_pins (user_id, pin_hash, created_at, updated_at)
SELECT 
  id,
  crypt('1234567890', gen_salt('bf')),
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'hsehub@admin'
ON CONFLICT (user_id) DO UPDATE SET
  pin_hash = crypt('1234567890', gen_salt('bf')),
  updated_at = NOW();

-- Step 5: Create/Replace the verify_super_admin_pin function
CREATE OR REPLACE FUNCTION public.verify_super_admin_pin(input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_pin_hash TEXT;
BEGIN
  -- Get the PIN hash for the current user
  SELECT pin_hash INTO stored_pin_hash
  FROM public.super_admin_pins
  WHERE user_id = auth.uid();

  -- If no PIN found, return false
  IF stored_pin_hash IS NULL THEN
    RAISE NOTICE 'No PIN found for user %', auth.uid();
    RETURN FALSE;
  END IF;

  -- Verify the PIN using crypt
  RETURN (crypt(input_pin, stored_pin_hash) = stored_pin_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_super_admin_pin(TEXT) TO authenticated;

-- Step 7: Verify setup
SELECT 'Verification:' as step;

SELECT 
  u.email,
  sp.user_id IS NOT NULL as has_pin,
  sp.created_at as pin_created
FROM auth.users u
LEFT JOIN public.super_admin_pins sp ON u.id = sp.user_id
WHERE u.email = 'hsehub@admin';

SELECT '✅ PIN should now work! Try entering: 1234567890' as result;
