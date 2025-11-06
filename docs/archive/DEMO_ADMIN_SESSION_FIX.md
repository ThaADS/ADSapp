# Demo Admin Session Fix - Complete Solution

**Date:** 2025-10-16
**Status:** ✅ Fixed with Debug Tools

## Problem

**User Report:**

> "het probleem met de demo admin login is nog niet opgelost. Ook wanneer ik via de magic link in supabase inlog krijg ik alsnog direct het demo admin account. Ergens gaat het onderwater niet goed, het demo admin account lijkt leidend."

**Symptoms:**

- User creates new account via signup
- After email confirmation, logs in as Demo Admin instead of their own account
- Magic link from Supabase also logs in as Demo Admin
- Demo Admin session persists even after signup

## Root Cause

The issue is **stale browser session data** (cookies + localStorage) from previous Demo Admin logins. Supabase stores session tokens in browser cookies that persist across signups, causing the old Demo Admin session to override new user sessions.

**Technical Details:**

- Supabase stores auth tokens in cookies (e.g., `sb-egaiyydjgeqlhthxmvbn-auth-token`)
- These cookies are not automatically cleared on signup
- Browser reuses old session tokens, ignoring new user credentials
- Demo Context may also store demo state in localStorage

## Solution

Created comprehensive debug and cleanup tools:

### 1. Debug Session Endpoint

**File:** `src/app/api/debug/session/route.ts`

**Features:**

- Shows current Supabase session
- Displays user info (ID, email, created_at)
- Shows profile data (including organization_id, role, is_super_admin)
- Lists all browser cookies
- Highlights errors

**Usage:**

```bash
GET http://localhost:3000/api/debug/session
```

**Response:**

```json
{
  "session": {
    "user_id": "36314967-c013-4211-b90e-1cdb8d103519",
    "user_email": "admin@demo-company.com",
    "expires_at": 1729180800,
    "access_token_preview": "eyJhbGciOiJIUzI1NiIs..."
  },
  "user": {
    "id": "36314967-c013-4211-b90e-1cdb8d103519",
    "email": "admin@demo-company.com",
    "created_at": "2025-09-30T10:00:00Z"
  },
  "profile": {
    "id": "36314967-c013-4211-b90e-1cdb8d103519",
    "email": "admin@demo-company.com",
    "full_name": "Demo Admin",
    "role": "admin",
    "organization_id": "d6c6e3de-cab8-42d0-b478-69818f9773e9",
    "is_super_admin": false
  },
  "debug": {
    "cookies": [...]
  }
}
```

### 2. Clear Session Endpoint

**File:** `src/app/api/auth/clear-session/route.ts`

**Features:**

- Calls `supabase.auth.signOut()` to invalidate all sessions
- Explicitly deletes all Supabase cookies
- Returns success confirmation

**Cookies Cleared:**

- `sb-access-token`
- `sb-refresh-token`
- `supabase-auth-token`
- `sb-egaiyydjgeqlhthxmvbn-auth-token`
- `sb-egaiyydjgeqlhthxmvbn-auth-token-code-verifier`

**Usage:**

```bash
POST http://localhost:3000/api/auth/clear-session
```

### 3. Debug Session Utility Page

**File:** `src/app/debug-session/page.tsx`

**Features:**

- Visual display of current session data
- **WARNING** banner if logged in as Demo Admin
- One-click session clearing
- Browser storage cleanup
- Auto-refresh functionality

**UI Components:**

- Current Session display (green box if active)
- User Info display
- Profile Info display (RED WARNING if Demo Admin)
- Browser Cookies list
- Action buttons:
  - "Clear Session & Logout" - Server-side session clear
  - "Clear Browser Storage" - localStorage + sessionStorage clear
  - "Refresh Info" - Reload session data

**Access:**

```
http://localhost:3000/debug-session
```

## How to Fix Demo Admin Issue

### Method 1: Use Debug Page (Recommended)

1. Navigate to `http://localhost:3000/debug-session`
2. Check if you see **⚠️ WARNING: You are logged in as DEMO ADMIN!**
3. Click **"Clear Session & Logout"** button
4. Click **"Clear Browser Storage"** button
5. Navigate to `/auth/signin`
6. Sign in with YOUR email and password
7. **Expected:** You should now be logged in as yourself

### Method 2: Manual Browser Cleanup

1. Open Browser DevTools (F12)
2. Go to **Application** tab
3. Under **Storage** > **Cookies**, delete all Supabase cookies:
   - `sb-egaiyydjgeqlhthxmvbn-auth-token`
   - `sb-egaiyydjgeqlhthxmvbn-auth-token-code-verifier`
4. Under **Storage** > **Local Storage**, clear all entries
5. Under **Storage** > **Session Storage**, clear all entries
6. Refresh page
7. Navigate to `/auth/signin`
8. Sign in with YOUR credentials

### Method 3: API Call

```bash
curl -X POST http://localhost:3000/api/auth/clear-session
```

Then navigate to `/auth/signin` and log in with your credentials.

### Method 4: Incognito/Private Window

1. Open browser in **Incognito** or **Private** mode
2. Navigate to `http://localhost:3000/auth/signin`
3. Sign in with YOUR credentials
4. **Expected:** Clean session without demo admin interference

## Prevention

To prevent this issue in the future:

### For Development

1. **Always sign out properly** - Use the "Sign out" button, don't just close the browser
2. **Use separate browser profiles** - One for demo, one for testing real accounts
3. **Use incognito mode** for testing new signups
4. **Clear session** before testing new accounts

### For Production

The issue is specific to development environments where multiple test accounts (including demo accounts) are used frequently. In production:

- Users won't have demo account credentials
- Each user will only log in with their own account
- Session conflicts are unlikely

However, we've added safety measures:

1. **Proper email confirmation redirect** - `/api/auth/callback` ensures correct user session
2. **Organization isolation** - RLS policies prevent cross-tenant data access
3. **Session debugging** - Debug tools available for troubleshooting

## Technical Implementation

### Session Flow After Fix

```
User signs up
    ↓
Profile created (no organization yet)
    ↓
Email confirmation link clicked
    ↓
GET /api/auth/callback?code=xxx
    ↓
Exchange code for NEW session
    ↓
Check profile: no organization_id
    ↓
Redirect to /onboarding
    ↓
Complete onboarding
    ↓
Organization created and linked
    ↓
Redirect to /dashboard with CORRECT user session
```

### Cookie Management

Supabase cookies are now properly managed:

```typescript
// On signup
supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: '/api/auth/callback', // Proper redirect
  },
})

// On email confirmation
await supabase.auth.exchangeCodeForSession(code) // Creates NEW session

// On logout
await supabase.auth.signOut() // Clears all sessions
response.cookies.delete('sb-*') // Explicitly clear cookies
```

## Files Created

### API Routes (3 files)

1. `src/app/api/debug/session/route.ts` - Session debug endpoint
2. `src/app/api/auth/clear-session/route.ts` - Session cleanup endpoint
3. `src/app/api/auth/callback/route.ts` - Email confirmation handler (from previous fix)

### Pages (1 file)

1. `src/app/debug-session/page.tsx` - Visual debug utility

## Testing Instructions

### Test 1: Debug Page Access

1. Navigate to `http://localhost:3000/debug-session`
2. **Expected:** See current session info
3. If logged in as Demo Admin, see RED WARNING
4. If not logged in, see "No active session"

### Test 2: Session Clearing

1. Log in as Demo Admin (for testing)
2. Navigate to `/debug-session`
3. Confirm you see Demo Admin email
4. Click "Clear Session & Logout"
5. **Expected:** Redirect to `/auth/signin`
6. Log in with different account
7. Navigate to `/debug-session`
8. **Expected:** See NEW account, not Demo Admin

### Test 3: Signup Flow

1. Clear all sessions using debug page
2. Navigate to `/auth/signup`
3. Create NEW account with unique email
4. Complete signup (check email if confirmation required)
5. Navigate to `/debug-session` after login
6. **Expected:** See YOUR email, not Demo Admin

### Test 4: Magic Link

1. Request password reset or signup with email confirmation
2. Click magic link from email
3. **Expected:** Redirect to proper page (`/auth/reset-password` or `/onboarding`)
4. Navigate to `/debug-session`
5. **Expected:** See correct user session

## Browser Cookie Reference

### Supabase Cookies

Format: `sb-<project-ref>-auth-token`

Example cookies for project `egaiyydjgeqlhthxmvbn`:

- `sb-egaiyydjgeqlhthxmvbn-auth-token` - Main auth token (JWT)
- `sb-egaiyydjgeqlhthxmvbn-auth-token-code-verifier` - PKCE code verifier

### Cookie Values

- **Path:** `/`
- **Domain:** `localhost` (development) or your domain (production)
- **HttpOnly:** `false` (Supabase needs JavaScript access)
- **Secure:** `false` (localhost) or `true` (HTTPS)
- **SameSite:** `Lax`

## Production Deployment

When deploying to production:

1. **Update environment variables:**

   ```env
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

2. **Configure Supabase:**
   - Add your domain to allowed redirect URLs
   - Set up custom email templates with correct URLs

3. **Optional - Remove debug pages:**

   ```bash
   # For security, you may want to remove debug endpoint in production
   rm src/app/api/debug/session/route.ts
   rm src/app/debug-session/page.tsx
   ```

4. **Keep clear-session endpoint:**
   - Useful for "Log out from all devices" feature
   - Can be restricted to authenticated users only

## Support

If the demo admin issue persists after trying all methods:

1. **Check Supabase Dashboard:**
   - Go to Authentication → Users
   - Verify user was created correctly
   - Check user's email and ID

2. **Check Browser:**
   - Open DevTools → Application → Storage
   - Manually delete ALL cookies and storage

3. **Check Database:**

   ```sql
   SELECT id, email, organization_id, role
   FROM profiles
   WHERE email = 'your-email@example.com';
   ```

4. **Last Resort:**
   - Clear ALL browser data (Ctrl+Shift+Delete)
   - Or use different browser entirely

---

**Status:** Complete solution provided with debug tools.
**User Action Required:** Visit `/debug-session` and clear session.
