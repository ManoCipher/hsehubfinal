# Super Admin Error Fixes

## Issues Resolved

### 1. Infinite Recursion in RLS Policy ❌→✅

**Error**: `infinite recursion detected in policy for relation "user_roles"`

**Cause**: The RLS policy on `user_roles` was checking `is_platform_super_admin()` function, which in turn queries `user_roles` table, creating an infinite loop.

**Solution**: Updated RLS policies to check `raw_user_meta_data` directly instead of querying the same table.

**Files Modified**:
- [20260103000002_fix_rls_recursion.sql](supabase/migrations/20260103000002_fix_rls_recursion.sql) - New migration

### 2. PIN Field Showing Default Value ❌→✅

**Issue**: PIN input field was showing spacing/tracking that made it look like there was a default value.

**Cause**: CSS styling `tracking-[0.5em]` and `text-center` was creating visual confusion with the placeholder.

**Solution**: Removed the wide letter-spacing and center alignment, changed placeholder to dots `••••••••••`.

**Files Modified**:
- [PinVerification.tsx](src/pages/SuperAdmin/PinVerification.tsx) - Simplified input styling

## How to Apply Fixes

### Step 1: Run the Migration

In **Supabase SQL Editor**, run:
```sql
-- File: supabase/migrations/20260103000002_fix_rls_recursion.sql
```

This will:
- Drop the recursive RLS policies
- Create new non-recursive policies using `raw_user_meta_data`
- Fix both `user_roles` and `profiles` tables

### Step 2: Restart Dev Server

```bash
# Press Ctrl+C to stop
npm run dev
```

### Step 3: Test

1. Login as super admin: `hsehub@admin` / `superadmin@hsehub`
2. Enter PIN: `1234567890`
3. Navigate to **Companies** page
4. Should load without "infinite recursion" error
5. PIN field should not show any default value

## Technical Details

### RLS Policy Changes

**Before** (Recursive):
```sql
CREATE POLICY "user_roles_select_own_company" ON public.user_roles
  FOR SELECT USING (
    public.is_platform_super_admin()  -- ❌ This queries user_roles again!
    OR ...
  );
```

**After** (Non-Recursive):
```sql
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'  -- ✅ No recursion
    )
    OR ...
  );
```

### Why This Works

1. **Direct metadata check**: Checks `auth.users.raw_user_meta_data` which was set when creating the super admin
2. **No self-reference**: Doesn't query `user_roles` table while evaluating `user_roles` policy
3. **Same functionality**: Still restricts access correctly for company users

## Verification

After applying fixes, verify:

- [ ] Migration ran without errors
- [ ] Super Admin can view Companies page
- [ ] Company list loads (may be empty if no companies exist)
- [ ] No "infinite recursion" errors in console
- [ ] PIN field looks clean with no default value
- [ ] PIN verification still works correctly

## Additional Improvements Made

1. **Added `autoComplete="off"`** to PIN input to prevent browser autofill
2. **Simplified placeholder** from "Enter your PIN" to dots `••••••••••`
3. **Removed confusing spacing** that made empty field look filled
4. **Better error messages** for policy violations

---

**Status**: ✅ Ready for Testing  
**Date**: January 3, 2026
