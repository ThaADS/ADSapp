# Testing Authentication Redirect Fix

## Quick Test Guide

### Prerequisites
1. Start the development server: `npm run dev`
2. Clear browser cookies/localStorage for localhost:3000
3. Have the super admin credentials ready

### Test Case 1: Super Admin Redirect
**Objective:** Verify super admin is redirected to /admin after signin

1. Navigate to http://localhost:3000/auth/signin
2. Enter credentials:
   - Email: `superadmin@adsapp.com`
   - Password: [your password]
3. Click "Sign in"
4. **Expected Result:** Browser redirects to http://localhost:3000/admin
5. **Expected Display:** Super Admin Dashboard with navigation menu

**Verification Points:**
- [ ] No redirect to /onboarding
- [ ] Admin dashboard loads correctly
- [ ] Top bar shows "Super Admin Dashboard"
- [ ] Navigation menu visible with links to Organizations, Users, Billing, Settings

### Test Case 2: Direct Admin Access (While Logged In)
**Objective:** Verify super admin can access admin pages directly

1. While logged in as super admin, navigate to http://localhost:3000/admin
2. **Expected Result:** Admin dashboard loads
3. Try accessing http://localhost:3000/admin/organizations
4. **Expected Result:** Organizations page loads

### Test Case 3: Direct Admin Access (Not Logged In)
**Objective:** Verify authentication protection works

1. Sign out (if logged in)
2. Try to navigate directly to http://localhost:3000/admin
3. **Expected Result:** Redirect to http://localhost:3000/auth/signin

### Test Case 4: Onboarding Protection
**Objective:** Verify super admin can't get stuck on onboarding

1. While logged in as super admin, try to navigate to http://localhost:3000/onboarding
2. **Expected Result:** Immediately redirected to http://localhost:3000/admin

### Test Case 5: Root Page Redirect
**Objective:** Verify logged-in super admin is redirected from root

1. While logged in as super admin, navigate to http://localhost:3000/
2. **Expected Result:** Redirected through /redirect to /admin

## Debugging Issues

### Issue: Still redirecting to /onboarding
**Possible Causes:**
1. Browser cache - Clear browser cache and cookies
2. Old session data - Sign out and sign in again
3. Database not updated - Run: `node verify-super-admin.js` to check database

**Fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev
```

### Issue: "User not found" or authentication error
**Possible Causes:**
1. Invalid credentials
2. User doesn't exist in database
3. Supabase connection issues

**Fix:**
1. Verify super admin exists in database
2. Check .env.local has correct Supabase credentials
3. Check Supabase dashboard for user status

### Issue: Blank page or error on /admin
**Possible Causes:**
1. SuperAdminDashboard component error
2. Missing admin dashboard components
3. Permission check failing

**Check:**
1. Browser console for JavaScript errors
2. Terminal for server-side errors
3. Network tab for failed API calls

## Expected Behavior Summary

| User Type | After Signin | Direct /admin Access | Direct /onboarding Access |
|-----------|-------------|---------------------|--------------------------|
| Super Admin (is_super_admin=true) | → /admin | ✓ Loads | → /admin (redirect) |
| Regular User with Organization | → /dashboard | → /dashboard (redirect) | ✓ Loads if no org |
| Regular User without Organization | → /onboarding | → /onboarding (redirect) | ✓ Loads |

## Success Criteria

✅ All 5 test cases pass
✅ No console errors in browser
✅ No server errors in terminal
✅ Super admin can access all admin pages
✅ Regular users cannot access admin pages

## Additional Testing

### Test with Regular User (Optional)
If you have a regular user account:
1. Sign out
2. Sign in with regular user credentials
3. Verify you're redirected to /dashboard (if has organization) or /onboarding
4. Try accessing /admin - should be redirected away

### Test Session Persistence
1. Sign in as super admin
2. Close browser tab
3. Open new tab to http://localhost:3000
4. Verify you're still logged in and redirected to /admin

---

**Last Updated:** 2025-09-30
**Changes Made:** Authentication redirect logic fix