# How to Add Super Admin Credentials to Database

I've created the SQL script `ADD_SUPER_ADMIN_CREDENTIALS.sql` with your super admin credentials:

- **Email**: `hsehub@admin`
- **Password**: `superadmin@hsehub`
- **PIN**: `1234567890`

## How to Execute the Script

You have **3 options** to run this SQL script:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `ADD_SUPER_ADMIN_CREDENTIALS.sql` from this project
5. Copy all the contents
6. Paste into the SQL Editor
7. Click **Run** button

### Option 2: Using Supabase CLI (If installed)

If you have Supabase CLI installed:

```bash
supabase db execute --file ADD_SUPER_ADMIN_CREDENTIALS.sql
```

### Option 3: Run the migration file directly

The credentials are already defined in the migration file. You can run:

```bash
supabase db push
```

This will apply all pending migrations including the super admin setup.

## After Running the Script

Once the script executes successfully, you should see messages like:

```
✅ Super Admin Setup Complete!

📧 Email: hsehub@admin
🔑 Password: superadmin@hsehub
🔢 PIN: 1234567890

You can now login to the application with these credentials.
```

## Testing the Login

1. Navigate to your app's login page (usually `/auth`)
2. Enter:
   - **Email**: `hsehub@admin`
   - **Password**: `superadmin@hsehub`
3. After successful login, you should see the **Super Admin** section in the sidebar
4. The PIN `1234567890` will be used for sensitive operations

## Troubleshooting

If you don't see the Super Admin menu after login:

1. **Clear browser cache**: Press `Ctrl+Shift+Delete` and clear all site data
2. **Log out and log back in**: This refreshes your session
3. **Check the database**: Run this query to verify the user was created:

```sql
SELECT 
  u.email,
  ur.role,
  ur.company_id
FROM auth.users u
INNER JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'hsehub@admin';
```

You should see a row with:
- email: `hsehub@admin`
- role: `super_admin`
- company_id: `NULL` (this means platform super admin)

## What the Script Does

The script:
1. ✅ Creates the super admin user in `auth.users` with hashed password
2. ✅ Creates a profile in `public.profiles`
3. ✅ Assigns the `super_admin` role in `public.user_roles` (with NULL company_id for platform-level access)
4. ✅ Creates/updates the `super_admin_pins` table
5. ✅ Stores the PIN securely (hashed with bcrypt)
6. ✅ Sets up appropriate RLS policies for PIN access

The super admin will have access to:
- All companies
- All subscriptions
- Analytics
- Audit logs
- Add-ons management
