-- STEP 17: Fix duplicate index on drip_enrollments
-- The UNIQUE index on (campaign_id, contact_id) already covers campaign_id lookups
-- So idx_drip_enrollments_campaign_id is redundant

DROP INDEX IF EXISTS idx_drip_enrollments_campaign_id;

SELECT 'Step 17 complete: Duplicate index removed!' AS status;
