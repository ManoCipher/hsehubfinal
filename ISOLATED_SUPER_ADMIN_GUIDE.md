# Super Admin Account Setup Guide

## 🔐 Isolated Platform Super Admin Created

A completely isolated super admin account has been created that is **independent of all companies**.

### Account Details

- **Email:** `hsehub@admin`
- **Password:** `superadmin@hsehub`
- **Name:** HSE HuB Admin
- **PIN:** `1234567890` (stored securely, hashed in database)
- **Role:** Platform Super Admin
- **Company Association:** NONE (company_id = NULL)

## 🎯 Key Features

### Isolation & Security
✅ **No Company Association** - This admin has `company_id = NULL`, making it platform-level  
✅ **Hidden from Companies** - Regular company users/admins cannot see this account  
✅ **Full Platform Access** - Can view and manage ALL companies and their data  
✅ **Secure PIN Storage** - PIN is hashed with bcrypt, not stored in plain text  
✅ **RLS Protected** - Row-level security policies ensure proper isolation  

### What This Admin Can Do
- ✅ Access all Super Admin pages (`/super-admin/*`)
- ✅ View all companies and their subscription details
- ✅ Manage subscription packages and pricing
- ✅ Create and assign add-ons to companies
- ✅ View analytics across all companies
- ✅ Monitor platform-wide metrics and usage

### What Companies CANNOT Do
- ❌ See the super admin in their user lists
- ❌ Access super admin profile
- ❌ View or access Super Admin panel
- ❌ See any trace of platform-level admins

## 📋 Setup Instructions

### Step 1: Apply the Migration

```bash
cd /home/manoj/Documents/Manoj/Projects/FreeLance/Fiverr/Pavel\ Client/hsehubfinal
npx supabase db push
```

Or run manually in Supabase SQL Editor:
- File: `supabase/migrations/20260103000000_create_isolated_super_admin.sql`

### Step 2: Verify Creation

In Supabase SQL Editor, run:

```sql
-- Check if super admin exists
SELECT 
  u.email,
  p.full_name,
  ur.role,
  ur.company_id,
  CASE 
    WHEN ur.company_id IS NULL THEN '✅ Platform Super Admin'
    ELSE '⚠️ Company Admin'
  END as admin_type
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';
```

**Expected Result:**
```
email: hsehub@admin
full_name: HSE HuB Admin
role: super_admin
company_id: NULL
admin_type: ✅ Platform Super Admin
```

### Step 3: Login & Test

1. Go to `http://localhost:8080/auth`
2. Login with:
   - **Email:** `hsehub@admin`
   - **Password:** `superadmin@hsehub`
3. After login, you should see the **Super Admin** section in sidebar
4. Test accessing all Super Admin pages

## 🔍 Verification Checklist

After setup, verify:

- [ ] Migration applied successfully (no errors)
- [ ] Super admin account exists in database
- [ ] `company_id` is NULL in `user_roles` table
- [ ] Can login with `hsehub@admin` credentials
- [ ] Super Admin menu visible in sidebar after login
- [ ] Can access all 5 Super Admin pages
- [ ] Created a test company user account
- [ ] Test company user CANNOT see super admin in user lists
- [ ] Test company user CANNOT access `/super-admin/*` routes

## 🛡️ Security Features

### PIN Verification System

The super admin has a secure PIN that can be used for sensitive operations:

```sql
-- Verify PIN in SQL
SELECT public.verify_super_admin_pin('1234567890');
-- Returns: true (if correct PIN)
```

**Future Use Cases for PIN:**
- Deleting companies
- Modifying subscription packages
- Accessing sensitive analytics
- Performing bulk operations
- Resetting company data

### Helper Functions Created

1. **`verify_super_admin_pin(input_pin TEXT)`**
   - Verifies if provided PIN matches the stored hash
   - Returns boolean (true/false)
   - Example: `SELECT verify_super_admin_pin('1234567890');`

2. **`is_platform_super_admin()`**
   - Checks if current authenticated user is platform super admin
   - Returns boolean
   - Used in RLS policies for isolation

## 🔒 RLS Policies Updated

### Isolation Policies

**`user_roles` table:**
- Super admins can see ALL roles
- Company users can ONLY see roles from their company
- Platform super admins (NULL company_id) are hidden from company views

**`profiles` table:**
- Super admins can see ALL profiles
- Company users can ONLY see profiles from their company
- Platform super admin profile is hidden from companies

## 📊 Database Schema

### New Table: `super_admin_pins`

```sql
CREATE TABLE public.super_admin_pins (
  user_id UUID PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Stores hashed PINs for super admin accounts with RLS protection.

## 🚨 Important Notes

### Security Best Practices

1. **Change Default Password**
   ```sql
   -- After first login, change password via Supabase Auth UI
   -- Or run in SQL:
   UPDATE auth.users
   SET encrypted_password = crypt('your-new-strong-password', gen_salt('bf'))
   WHERE email = 'hsehub@admin';
   ```

2. **Change PIN if Compromised**
   ```sql
   UPDATE public.super_admin_pins
   SET pin_hash = crypt('new-pin', gen_salt('bf')),
       updated_at = NOW()
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin');
   ```

3. **Monitor Super Admin Activity**
   - Enable audit logging for super admin actions
   - Track company data access
   - Log sensitive operations

### Differences from Company Admins

| Feature | Platform Super Admin | Company Admin |
|---------|---------------------|---------------|
| Company Association | ❌ None (NULL) | ✅ Linked to company |
| Visible to Companies | ❌ Hidden | ✅ Visible in company |
| Access All Companies | ✅ Yes | ❌ Only their company |
| Manage Subscriptions | ✅ Yes | ❌ No |
| Platform Analytics | ✅ Yes | ❌ No |
| Super Admin Menu | ✅ Visible | ❌ Hidden |

## 🧪 Testing Scenarios

### Test 1: Isolation Test

1. Login as `hsehub@admin` (super admin)
2. Go to Super Admin → Companies
3. Note all companies visible
4. Logout
5. Login as a company admin user
6. Go to Settings → Users/Team
7. **Verify:** Super admin NOT in user list
8. Try accessing `/super-admin/dashboard`
9. **Verify:** Redirected with "Access Denied"

### Test 2: Data Access Test

1. Login as super admin
2. Go to Super Admin → Companies
3. Click on any company
4. **Verify:** Can see all company data
5. Go to Super Admin → Analytics
6. **Verify:** Can see metrics from all companies

### Test 3: PIN Verification Test

Run in SQL Editor while logged in as super admin:

```sql
-- Should return true
SELECT public.verify_super_admin_pin('1234567890');

-- Should return false
SELECT public.verify_super_admin_pin('wrong-pin');
```

## 📝 Maintenance

### Add Additional Super Admins

```sql
-- Create another platform super admin
INSERT INTO auth.users (email, encrypted_password, ...)
VALUES (...);

INSERT INTO public.user_roles (user_id, role, company_id)
VALUES (new_user_id, 'super_admin', NULL);  -- NULL = platform admin
```

### Revoke Super Admin Access

```sql
-- Remove super admin role
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin')
AND role = 'super_admin';

-- Or change to company admin
UPDATE public.user_roles
SET role = 'company_admin',
    company_id = 'some-company-id'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin');
```

## 🆘 Troubleshooting

### Issue: Cannot login with super admin credentials

**Solution:**
```sql
-- Check if user exists
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'hsehub@admin';

-- Ensure email is confirmed
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'hsehub@admin';
```

### Issue: Super Admin menu not showing

**Solution:**
1. Check role assignment:
   ```sql
   SELECT role, company_id 
   FROM user_roles 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hsehub@admin');
   ```
2. Ensure `company_id` is NULL
3. Clear browser cache and re-login

### Issue: Can see super admin in company user list

**Solution:**
```sql
-- Verify RLS policies are active
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'profiles');

-- Re-apply isolation policies from migration file
```

---

**Created:** January 3, 2026  
**Status:** Production Ready  
**Security Level:** High - Isolated Platform Administrator
