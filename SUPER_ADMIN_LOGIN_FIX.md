# Super Admin Login Fix Guide

## Problem
You're getting "invalid login" because the super admin user doesn't exist in Supabase's `auth.users` table yet.

## Your Credentials
- **Email**: `hsehub@admin`
- **Password**: `superadmin@hsehub`
- **PIN**: `1234567890`

## Solution: 2 Step Process

### STEP 1: Verify Current State

First, let's check if the user exists. Go to your Supabase Dashboard:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `zczaicsmeazucvsihick`
3. Click **SQL Editor** in the left sidebar
4. Run the verification script: `VERIFY_SUPER_ADMIN.sql`

This will show you if the user exists in:
- `auth.users` table
- `public.user_roles` table  
- `public.profiles` table

### STEP 2: Create the Super Admin User

You have **2 options** to create the super admin:

---

## Option A: Use Supabase Dashboard SQL Editor (RECOMMENDED)

This is the most reliable method:

1. **Go to**: [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → **SQL Editor**

2. **Create a New Query** and paste this SQL:

```sql
-- Delete any existing super admin with this email (clean slate)
DELETE FROM auth.users WHERE email = 'hsehub@admin';

-- Now create the super admin user
DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    email_change_confirm_status,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'hsehub@admin',
    crypt('superadmin@hsehub', gen_salt('bf')),
    NOW(),
    0,
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HSE HuB Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO super_admin_id;

  RAISE NOTICE 'Created user with ID: %', super_admin_id;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (super_admin_id, 'hsehub@admin', 'HSE HuB Admin', NOW(), NOW());

  -- Assign super_admin role
  INSERT INTO public.user_roles (user_id, role, company_id, created_at)
  VALUES (super_admin_id, 'super_admin'::app_role, NULL, NOW());

  -- Create super_admin_pins table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.super_admin_pins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Store the PIN
  INSERT INTO public.super_admin_pins (user_id, pin_hash)
  VALUES (super_admin_id, crypt('1234567890', gen_salt('bf')));

  RAISE NOTICE '✅ Super Admin created successfully!';
  RAISE NOTICE 'Email: hsehub@admin';
  RAISE NOTICE 'Password: superadmin@hsehub';
  RAISE NOTICE 'PIN: 1234567890';
END $$;
```

3. **Click RUN** ✅

4. **Verify** it worked by running:

```sql
SELECT 
  u.email,
  ur.role,
  ur.company_id
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';
```

You should see:
- email: `hsehub@admin`
- role: `super_admin`
- company_id: `null`

---

## Option B: Use Migration File

If you want to use the migration system:

1. The migration file already exists: `supabase/migrations/20260103000000_create_isolated_super_admin.sql`

2. Check if it's been applied:
   - Go to Supabase Dashboard → Database → Migrations
   - Look for `20260103000000_create_isolated_super_admin`

3. If it hasn't been applied, you can manually run it in SQL Editor by copying the contents of that file

---

## Testing the Login

After creating the user:

1. **Clear your browser**: 
   - Press `F12` to open DevTools
   - Go to **Application** tab
   - Click **Clear site data**
   - Close DevTools

2. **Navigate to**: `http://localhost:8080/auth` (or wherever your app is running)

3. **Login with**:
   - Email: `hsehub@admin`
   - Password: `superadmin@hsehub`

4. **Expected result**:
   - You should be redirected to `/super-admin/verify` (PIN page)
   - Enter PIN: `1234567890`
   - You should then see the Super Admin dashboard

---

## Troubleshooting

### Still getting "Invalid Login"?

Run this diagnostic query in Supabase SQL Editor:

```sql
-- Check if email exists
SELECT id, email, email_confirmed_at, encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email = 'hsehub@admin';
```

If **no rows** appear → The user doesn't exist, go back to Step 2

If **rows appear** → The user exists but password might be wrong

### Password Issues

If the user exists but login still fails, reset the password:

```sql
UPDATE auth.users
SET encrypted_password = crypt('superadmin@hsehub', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'hsehub@admin';
```

### Can't access SQL Editor?

If you can't access Supabase Dashboard:

1. Check your Supabase project URL: `https://zczaicsmeazucvsihick.supabase.co`
2. Make sure you're logged into the correct Supabase account
3. Verify you have owner/admin access to the project

---

## What Each File Does

- **`ADD_SUPER_ADMIN_CREDENTIALS.sql`** - Full script with all safety checks
- **`VERIFY_SUPER_ADMIN.sql`** - Diagnostic queries to check current state
- **`SUPER_ADMIN_LOGIN_FIX.md`** - This guide!

---

## Quick Summary

1. ✅ Open Supabase Dashboard → SQL Editor
2. ✅ Run the SQL script from "Option A" above
3. ✅ Clear browser cache
4. ✅ Try logging in with `hsehub@admin` / `superadmin@hsehub`
5. ✅ Enter PIN `1234567890` when prompted

That's it! 🎉
