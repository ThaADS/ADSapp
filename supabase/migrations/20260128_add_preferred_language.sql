-- Migration: Add preferred_language column to profiles
-- Purpose: Store user's language preference (nl or en)
-- Part of Phase 10.5: i18n Completion

-- Add column with constraint (nullable - null means use cookie/browser fallback)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language TEXT
  CHECK (preferred_language IS NULL OR preferred_language IN ('nl', 'en'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.preferred_language IS
  'User preferred language (nl/en). NULL means use cookie/browser detection as fallback.';

-- Index for efficient lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language
  ON profiles(preferred_language)
  WHERE preferred_language IS NOT NULL;
