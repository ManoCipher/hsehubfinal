# 🚀 Quick Start: Access Super Admin Panel

## 1️⃣ Setup Isolated Super Admin (Automatic)
```bash
cd /home/manoj/Documents/Manoj/Projects/FreeLance/Fiverr/Pavel\ Client/hsehubfinal
./setup_super_admin.sh
```

**OR Manual Setup:**
```bash
npx supabase db pull  # Sync with remote
npx supabase db push  # Apply migrations
```

## 2️⃣ Start Dev Server
```bash
npm run dev
```
App runs at: `http://localhost:8080`

## 3️⃣ Login with Platform Super Admin

**Pre-created Isolated Super Admin:**
- Email: `hsehub@admin`
- Password: `superadmin@hsehub`
- PIN: `1234567890`
- Type: Platform Super Admin (no company association)

## 4️⃣ Login & Test
1. Go to `http://localhost:8080/auth`
2. Login with your email
3. Look for "Super Admin" section in sidebar
4. ClicTest Super Admin Access
1. Go to `http://localhost:8080/auth`
2. Login with: `hsehub@admin` / `superadmin@hsehub`
3. Look for "Super Admin" section in sidebar
4. Click on any Super Admin page (Dashboard, Companies, etc.)

**Note:** This account is isolated from all companies - it's the platform provider admin!
- `/super-admin/dashboard` - Overview & stats
- `/super-admin/companies` - Company management
- `/super-admin/subscriptions` - Package management
- `/super-admin/addons` - Add-ons catalog
- `/super-admin/analytics` - Revenue analytics

### ❌ Regular Users CANNOT:
- See Super Admin menu
- Access any `/super-admin/*` routes
- Will get "Access Denied" toast if they try

## 📋 Visual Check

**In sidebar, you should see:**
```
🏠 Dashboard
...regular menu items...

Super Admin (section)
├── 📊 Dashboard
├── 🏢 Companies
├── 📦 Subscriptions
├── 🧩 Add-ons
└── 📈 Analytics
```

**At bottom of sidebar:**
```
Company Name
Super Admin  ← Should say this, not "Company Admin"
```

## 🐛 Not Working?

1. **Migration issue:** Run `npx supabase db pull` then `npx supabase db push`
2. **Clear cache:** F12 → Application → Clear storage
3. **Verify super admin exists:**
   ```sql
   SELECT u.email, ur.role, ur.company_id 
   FROM auth.users u
   JOIN user_roles ur ON u.id = ur.user_id 
   WHERE u.email = 'hsehub@admin';
   ```
   Should return: `company_id = NULL` (isolated admin)

## 📚 Full Documentation

- **[ISOLATED_SUPER_ADMIN_GUIDE.md](ISOLATED_SUPER_ADMIN_GUIDE.md)** - Complete setup & security guide
- **[SUPER_ADMIN_TESTING_GUIDE.md](SUPER_ADMIN_TESTING_GUIDE.md)** - Testing instructions

## 🔐 Key Features

✅ **Completely Isolated** - No company association (company_id = NULL)  
✅ **Hidden from Companies** - Regular users can't see this admin  
✅ **Platform-Level Access** - Can manage all companies & subscriptions  
✅ **Secure PIN** - 1234567890 (hashed in database)  
✅ **Pre-configured** - Ready to use immediately after migration
