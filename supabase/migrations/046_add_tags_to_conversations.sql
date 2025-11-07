-- Add tags column to conversations table
-- This migration adds support for tagging conversations with multiple tags

-- ============================================================================
-- 1. ADD TAGS COLUMN TO CONVERSATIONS TABLE
-- ============================================================================

-- Add tags column as an array of tag IDs
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS tags UUID[] DEFAULT '{}';

-- ============================================================================
-- 2. CREATE INDEX FOR BETTER PERFORMANCE
-- ============================================================================

-- GIN index for array containment queries (e.g., WHERE tag_id = ANY(tags))
CREATE INDEX IF NOT EXISTS idx_conversations_tags ON conversations USING GIN(tags);

-- ============================================================================
-- 3. ADD FOREIGN KEY CONSTRAINT (OPTIONAL - COMMENTED OUT FOR FLEXIBILITY)
-- ============================================================================

-- Note: We don't enforce FK constraint on array elements as PostgreSQL doesn't support it natively
-- Instead, we rely on application-level validation and cleanup triggers

-- ============================================================================
-- 4. CREATE TRIGGER TO CLEANUP DELETED TAGS
-- ============================================================================

-- Function to remove deleted tag IDs from conversations
CREATE OR REPLACE FUNCTION cleanup_deleted_tags()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove the deleted tag ID from all conversations
  UPDATE conversations
  SET tags = array_remove(tags, OLD.id)
  WHERE OLD.id = ANY(tags);

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to cleanup tags when a tag is deleted
DROP TRIGGER IF EXISTS cleanup_deleted_tags_trigger ON tags;
CREATE TRIGGER cleanup_deleted_tags_trigger
  BEFORE DELETE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_deleted_tags();

-- ============================================================================
-- 5. HELPER FUNCTION TO ADD TAG TO CONVERSATION
-- ============================================================================

CREATE OR REPLACE FUNCTION add_tag_to_conversation(
  p_conversation_id UUID,
  p_tag_id UUID
)
RETURNS void AS $$
BEGIN
  -- Add tag if it doesn't already exist in the array
  UPDATE conversations
  SET tags = array_append(tags, p_tag_id)
  WHERE id = p_conversation_id
    AND NOT (p_tag_id = ANY(tags));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. HELPER FUNCTION TO REMOVE TAG FROM CONVERSATION
-- ============================================================================

CREATE OR REPLACE FUNCTION remove_tag_from_conversation(
  p_conversation_id UUID,
  p_tag_id UUID
)
RETURNS void AS $$
BEGIN
  -- Remove tag from the array
  UPDATE conversations
  SET tags = array_remove(tags, p_tag_id)
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION add_tag_to_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_tag_from_conversation(UUID, UUID) TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Tags column migration completed successfully';
  RAISE NOTICE '- tags column added to conversations table';
  RAISE NOTICE '- GIN index created for performance';
  RAISE NOTICE '- Cleanup trigger added for deleted tags';
  RAISE NOTICE '- Helper functions created for tag management';
END $$;
