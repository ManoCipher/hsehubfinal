# Super Admin Testing Guide

## Current Status

✅ **Super Admin Panel is PROTECTED** - All routes now require `super_admin` role
✅ **Super Admin Menu** - Visible only when user has `super_admin` role  
✅ **Access Control** - Unauthorized users will be redirected with error message

## Authentication Flow

### How Role-Based Access Works

1. **User Login** → User authenticates via Supabase Auth
2. **Role Check** → System checks `user_roles` table for user's role
3. **Menu Visibility** → Super Admin menu appears if `userRole === "super_admin"`
4. **Route Protection** → ProtectedRoute blocks access if role doesn't match

### Super Admin Menu Location

The Super Admin section appears in the sidebar (MainLayout) with these pages:
- 📊 Dashboard - Overview stats and quick actions
- 🏢 Companies - Manage all companies
- 📦 Subscriptions - Manage subscription packages
- 🧩 Add-ons - Manage add-on catalog and assignments
- 📈 Analytics - Revenue and usage analytics

## Step-by-Step Testing Guide

### Step 1: Apply Database Migration

First, ensure the addon system tables exist:

```bash
cd /home/manoj/Documents/Manoj/Projects/FreeLance/Fiverr/Pavel\ Client/hsehubfinal
supabase db push
```

Or manually run the migration in Supabase SQL Editor:
- File: `supabase/migrations/20260102000000_create_addon_system.sql`

### Step 2: Start Development Server

```bash
npm run dev
```

Your app should be running on `http://localhost:8080`

### Step 3: Create a Test User (if needed)

1. Navigate to `http://localhost:8080/auth`
2. Click "Sign Up" or "Register"
3. Create an account with:
   - Email: `admin@test.com` (or any email)
   - Password: Choose a secure password
4. Complete registration

### Step 4: Grant Super Admin Role

Open Supabase SQL Editor and run:

```sql
-- Replace 'admin@test.com' with your test email
INSERT INTO public.user_roles (user_id, role, company_id)
SELECT 
    id,
    'super_admin'::app_role,
    NULL
FROM auth.users
WHERE email = 'admin@test.com'  -- CHANGE THIS
ON CONFLICT (user_id, role, company_id) DO NOTHING;

-- Verify it worked
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'super_admin';
```

### Step 5: Refresh Your Session

**Important:** The app caches the user role, so you need to:

1. Log out from the app
2. Clear browser cache (optional but recommended):
   - Press F12 (DevTools)
   - Go to Application tab
   - Clear Storage → Clear site data
3. Log back in with your test account

### Step 6: Verify Super Admin Access

After logging in, you should see:

1. **In Sidebar:**
   ```
   Super Admin (section header)
   ├── 📊 Dashboard
   ├── 🏢 Companies  
   ├── 📦 Subscriptions
   ├── 🧩 Add-ons
   └── 📈 Analytics
   ```

2. **Bottom of Sidebar:**
   - Your role should show as "Super Admin" (not "Company Admin" or "Employee")

3. **Access Test:**
   - Click each Super Admin menu item
   - All pages should load without "Access Denied" errors
   - Try navigating directly to `/super-admin/dashboard`

## Testing Different User Roles

### Test as Regular Admin (company_admin)

1. Create another test user: `companyuser@test.com`
2. Assign company_admin role:
   ```sql
   -- First, find or create a company
   INSERT INTO public.companies (name, subscription_tier, subscription_status)
   VALUES ('Test Company', 'premium', 'active')
   RETURNING id;
   
   -- Use the returned company ID
   INSERT INTO public.user_roles (user_id, role, company_id)
   SELECT 
       id,
       'company_admin'::app_role,
       'PASTE_COMPANY_ID_HERE'  -- UUID from above
   FROM auth.users
   WHERE email = 'companyuser@test.com';
   ```
3. Log in as this user
4. **Expected:** NO Super Admin menu visible
5. Try accessing `/super-admin/dashboard` directly
6. **Expected:** Redirected to `/dashboard` with "Access Denied" toast

### Test as Employee

1. Create another test user: `employee@test.com`
2. Assign employee role (similar to above, use `'employee'::app_role`)
3. Log in as this user
4. **Expected:** NO Super Admin menu, cannot access any `/super-admin/*` routes

## Troubleshooting

### Issue: Super Admin menu not showing

**Solution:**
1. Check the role was added:
   ```sql
   SELECT u.email, ur.role 
   FROM auth.users u
   JOIN public.user_roles ur ON u.id = ur.user_id
   WHERE u.email = 'your-email@example.com';
   ```
2. Clear browser localStorage and cookies
3. Log out and log back in
4. Check browser console (F12) for errors

### Issue: "Access Denied" when clicking Super Admin pages

**Solution:**
1. Verify role in database (SQL above)
2. Check AuthContext is loading role correctly:
   - Open browser DevTools (F12)
   - Console tab
   - Type: `localStorage.getItem('supabase.auth.token')`
3. Ensure ProtectedRoute is getting `userRole === "super_admin"`

### Issue: Pages load but show empty data

**Solution:**
1. Check if migration ran successfully:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('addon_definitions', 'company_addons', 'subscription_history');
   ```
2. Should return 3 rows. If not, run the migration again.
3. Check if seed data was inserted:
   ```sql
   SELECT COUNT(*) FROM addon_definitions;
   ```
4. Should return 12 (the seeded add-ons)

### Issue: TypeScript errors in IDE

**Solution:**
```bash
npm install
npm run build
```

## What to Look For

### Dashboard Page (`/super-admin/dashboard`)
- Stats cards: Total Companies, Active Subscriptions, Trial Users, Monthly Revenue
- Quick Actions: 4 clickable cards
- Tier Distribution: Pie chart showing Basic/Standard/Premium breakdown
- Trials Expiring Soon: Table with countdown badges
- Recent Activity: List of recent company actions

### Companies Page (`/super-admin/companies`)
- Table of all companies
- Subscription tier badges (Basic/Standard/Premium)
- Status indicators (Active/Inactive/Trial/Cancelled)
- Action buttons for each company

### Subscriptions Page (`/super-admin/subscriptions`)
- Stats: Total companies, active subscriptions, trial users, MRR
- Table of subscription packages
- Create/Edit/Delete package buttons
- Toggle active/inactive status

### Add-ons Page (`/super-admin/addons`)
- Two tabs: "Add-on Catalog" and "Company Assignments"
- Create/Edit/Delete add-ons
- Assign add-ons to specific companies
- Category badges (Feature/Storage/Support/Integration)

### Analytics Page (`/super-admin/analytics`)
- Stats: Monthly Revenue, Avg Revenue/Company, Churn Rate, Total Storage
- Revenue Trends: Area chart (6 months)
- Growth Metrics: Line chart showing user growth
- Feature Usage: Bar chart of most used add-ons
- Company Resource Usage: Table with storage/employee data

## Expected Behavior

### ✅ Correct Behavior
- Super Admin can access ALL pages in the platform
- Super Admin sees dedicated Super Admin menu section
- Non-super-admin users CANNOT see or access Super Admin pages
- Attempting to access `/super-admin/*` as non-super-admin → redirect + error toast
- Role displayed at bottom of sidebar matches database role

### ❌ Incorrect Behavior (Report if seen)
- Super Admin menu visible but pages show "Access Denied"
- Regular admin can access Super Admin pages
- No redirect when accessing protected routes
- Role shown in sidebar doesn't match database

## Quick Test Checklist

- [ ] Database migration applied successfully
- [ ] Super admin user created in `user_roles` table
- [ ] Logged in with super admin account
- [ ] Super Admin menu section visible in sidebar
- [ ] All 5 Super Admin pages accessible
- [ ] Stats and charts loading with data
- [ ] Can create/edit subscription packages
- [ ] Can create/assign add-ons
- [ ] Tested as regular user - NO access to Super Admin
- [ ] Direct URL access blocked for non-super-admins
- [ ] "Access Denied" toast shown when unauthorized access attempted

## Next Steps After Testing

1. **Add Test Data:** Create some companies, add-ons, and subscriptions
2. **Test Workflows:** Try complete workflows (create package → assign to company → view analytics)
3. **Test Edge Cases:** What happens with no data? With thousands of companies?
4. **Enforcement:** Implement subscription tier limits (employee count, storage, features)
5. **Payment Integration:** Connect Stripe for actual subscription management
6. **Email Notifications:** Set up trial expiration reminders

## Support

If you encounter issues:
1. Check browser console (F12 → Console) for errors
2. Check Supabase logs for database errors
3. Verify all migrations ran successfully
4. Ensure Supabase project is running
5. Check network tab for failed API calls

---

**Created:** January 2, 2026  
**Updated:** January 2, 2026  
**Status:** Ready for Testing
