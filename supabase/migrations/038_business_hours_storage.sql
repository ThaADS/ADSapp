-- Migration: Business Hours Storage
-- Created: 2025-10-20
-- Purpose: Add business_hours column to organizations table for persistent storage

-- =============================================
-- 1. ADD BUSINESS HOURS COLUMN
-- =============================================

-- Add business_hours column to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT NULL;

-- =============================================
-- 2. VALIDATION FUNCTION
-- =============================================

-- Function to validate business hours format
CREATE OR REPLACE FUNCTION validate_business_hours(hours JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  day TEXT;
  day_data JSONB;
  valid_days TEXT[] := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
BEGIN
  -- If null, that's valid (not set yet)
  IF hours IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if it's an object
  IF jsonb_typeof(hours) != 'object' THEN
    RETURN FALSE;
  END IF;

  -- Validate each day
  FOR day IN SELECT * FROM unnest(valid_days) LOOP
    IF hours ? day THEN
      day_data := hours -> day;

      -- Check structure
      IF NOT (day_data ? 'enabled' AND day_data ? 'start' AND day_data ? 'end') THEN
        RETURN FALSE;
      END IF;

      -- Check types
      IF jsonb_typeof(day_data -> 'enabled') != 'boolean' THEN
        RETURN FALSE;
      END IF;

      IF jsonb_typeof(day_data -> 'start') != 'string' THEN
        RETURN FALSE;
      END IF;

      IF jsonb_typeof(day_data -> 'end') != 'string' THEN
        RETURN FALSE;
      END IF;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- 3. ADD VALIDATION CONSTRAINT
-- =============================================

-- Add constraint to ensure valid business hours format
ALTER TABLE organizations
ADD CONSTRAINT valid_business_hours_format
CHECK (validate_business_hours(business_hours));

-- =============================================
-- 4. COMMENTS
-- =============================================

COMMENT ON COLUMN organizations.business_hours IS 'Business hours configuration in JSONB format. Expected structure: {"monday": {"enabled": true, "start": "09:00", "end": "17:00"}, ...}';

-- =============================================
-- 5. EXAMPLE DATA STRUCTURE
-- =============================================

-- Example of valid business_hours JSONB:
-- {
--   "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
--   "saturday": {"enabled": false, "start": "09:00", "end": "17:00"},
--   "sunday": {"enabled": false, "start": "09:00", "end": "17:00"}
-- }

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Verify column was added
SELECT 'business_hours column added' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'organizations'
  AND column_name = 'business_hours'
);
