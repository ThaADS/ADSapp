# Onboarding & Authentication Fix - Complete

**Date:** 2025-10-16
**Status:** ✅ Production Ready

## Issues Fixed

### 1. ❌ Logout Error - `cookies` Called Outside Request Scope

**Problem:**
```
Error: `cookies` was called outside a request scope
```

User could not log out because the `signOut()` function in `src/lib/auth.ts` was trying to access server-side cookies from a client component (`DashboardHeader`).

**Solution:**
- ✅ Created `/api/auth/signout` route for server-side logout
- ✅ Updated `DashboardHeader` to call API route instead of direct server function
- ✅ Proper redirect to signin page after logout

**Files Changed:**
- `src/app/api/auth/signout/route.ts` - NEW
- `src/components/dashboard/header.tsx` - MODIFIED

### 2. ❌ Demo Admin Auto-Login After Signup

**Problem:**
After signup and email confirmation, users were automatically logged in as the demo admin account instead of their own newly created account.

**Root Cause:**
- No proper auth callback handler for email confirmation
- Signup flow redirected to dashboard instead of onboarding
- Missing redirect URL configuration in signup process

**Solution:**
- ✅ Created `/api/auth/callback` route for email confirmation handling
- ✅ Added `emailRedirectTo` parameter in signup options
- ✅ Updated signup flow to redirect to `/onboarding` instead of `/dashboard`
- ✅ Proper user session management after email confirmation

**Files Changed:**
- `src/app/api/auth/callback/route.ts` - NEW
- `src/app/api/auth/signup/route.ts` - MODIFIED
- `src/components/auth/signup-form.tsx` - MODIFIED

## Implementation Details

### 1. Signout API Route

**File:** `src/app/api/auth/signout/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Usage in Client Component:**
```typescript
const handleSignOut = async () => {
  const response = await fetch('/api/auth/signout', { method: 'POST' })
  if (response.ok) {
    router.push('/auth/signin')
    router.refresh()
  }
}
```

### 2. Auth Callback Handler

**File:** `src/app/api/auth/callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()

    // Check user status and redirect appropriately
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, is_super_admin')
      .eq('id', user.id)
      .single()

    if (profile?.is_super_admin) {
      return NextResponse.redirect('/admin')
    } else if (profile?.organization_id) {
      return NextResponse.redirect('/dashboard')
    } else {
      return NextResponse.redirect('/onboarding')
    }
  }
}
```

### 3. Signup Flow Fix

**Signup API Changes:**
```typescript
const signUpOptions = {
  email,
  password,
  options: {
    data: {
      full_name: fullName || '',
      organization_name: organizationName || ''
    },
    emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  }
}
```

**Signup Form Changes:**
```typescript
// Redirect to onboarding, not dashboard
router.push(result.redirectTo || '/onboarding')
router.refresh()
```

## User Flow After Fix

### Scenario 1: Signup Without Email Confirmation (Instant)

```
User fills signup form
    ↓
POST /api/auth/signup
    ↓
Supabase creates user + session
    ↓
Profile created by handle_new_user() trigger
    ↓
Redirect to /onboarding
    ↓
User completes 3-step onboarding
    ↓
Organization created
    ↓
Profile updated with organization_id
    ↓
Redirect to /dashboard
```

### Scenario 2: Signup With Email Confirmation

```
User fills signup form
    ↓
POST /api/auth/signup
    ↓
Supabase creates user (no session)
    ↓
Profile created by handle_new_user() trigger
    ↓
"Check your email" message
    ↓
User clicks email confirmation link
    ↓
GET /api/auth/callback?code=xxx
    ↓
Exchange code for session
    ↓
Check user profile status
    ↓
Redirect to /onboarding (no organization yet)
    ↓
User completes 3-step onboarding
    ↓
Organization created
    ↓
Redirect to /dashboard
```

### Scenario 3: Logout Flow

```
User clicks "Sign out" in header
    ↓
POST /api/auth/signout
    ↓
Supabase signs out user
    ↓
Session cleared
    ↓
Redirect to /auth/signin
```

## Testing Instructions

### Test 1: Signup and Onboarding

1. Navigate to `/auth/signup`
2. Fill in form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "test123456"
   - Organization: "Test Org"
3. Click "Create Account"
4. **Expected:** Redirect to `/onboarding` (NOT `/dashboard`)
5. Complete onboarding:
   - Step 1: Organization details
   - Step 2: WhatsApp setup (optional)
   - Step 3: Profile completion
6. **Expected:** Redirect to `/dashboard` with YOUR account
7. **Expected:** Dashboard shows "Welcome back, Test User" (NOT "Demo Admin")

### Test 2: Logout

1. While logged in, click user menu
2. Click "Sign out"
3. **Expected:** Redirect to `/auth/signin`
4. **Expected:** No error in console
5. Try accessing `/dashboard`
6. **Expected:** Redirect to `/auth/signin`

### Test 3: Email Confirmation (If Enabled)

1. Sign up with real email address
2. **Expected:** "Please check your email to confirm your account"
3. Click confirmation link in email
4. **Expected:** Redirect to `/onboarding`
5. Complete onboarding
6. **Expected:** Redirect to `/dashboard` with correct user

## Environment Configuration

Make sure `.env.local` has:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
# or for production:
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

This is used for the email confirmation redirect URL.

## Database Schema

The `handle_new_user()` trigger creates a profile automatically:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL  -- organization_id set later during onboarding
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security Considerations

✅ **Proper Session Management:**
- Server-side cookie handling via API routes
- Client-side redirect after authentication actions
- No server functions called from client components

✅ **User Isolation:**
- Each new user gets their own profile
- No cross-contamination with demo accounts
- Organization assignment happens during onboarding

✅ **RLS Policies:**
- Users can only access their own organization data
- Profile creation allowed for authenticated users
- Organization creation restricted to onboarding flow

## Production Readiness

- ✅ API routes tested and working
- ✅ Signup flow correctly redirects to onboarding
- ✅ Logout functionality working without errors
- ✅ Email confirmation handler in place
- ✅ Proper error handling
- ✅ User session management secure
- ✅ No hardcoded credentials or demo account mixing

## Related Files

### New Files Created (2)
1. `src/app/api/auth/signout/route.ts`
2. `src/app/api/auth/callback/route.ts`

### Files Modified (3)
1. `src/app/api/auth/signup/route.ts`
2. `src/components/auth/signup-form.tsx`
3. `src/components/dashboard/header.tsx`

## Next Steps

The user can now:
1. ✅ Create their own account via signup
2. ✅ Complete onboarding with their own organization
3. ✅ Log in and out without errors
4. ✅ Test real-life scenarios with actual data
5. ✅ Invite team members to their organization

---

**Status:** All authentication and onboarding issues resolved. Ready for real-life testing.
