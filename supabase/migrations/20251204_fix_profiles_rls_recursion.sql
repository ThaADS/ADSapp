-- Fix infinite recursion in profiles RLS policies
-- Error: 42P17 - infinite recursion detected in policy for relation "profiles"

-- Step 1: Drop ALL existing policies on profiles to start fresh
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Create simple, non-recursive policies for profiles
-- These policies only use auth.uid() directly, never query profiles table itself

-- Policy: Users can read their own profile
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Users can insert their own profile (during signup/onboarding)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy: Service role can do everything (for admin operations)
-- Note: Service role already bypasses RLS, but this is for clarity
CREATE POLICY "profiles_service_role_all"
ON profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 3: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- Step 4: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Verification comment
COMMENT ON TABLE profiles IS 'User profiles with non-recursive RLS policies (fixed 2024-12-04)';
