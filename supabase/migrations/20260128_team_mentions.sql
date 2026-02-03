-- Phase 11: Team Collaboration - @Mentions System
-- Plan 11-01: Database schema for conversation notes and mentions

-- ============================================================================
-- TABLE: conversation_notes
-- Purpose: Store internal team notes on conversations (with @mention support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  content TEXT NOT NULL,              -- HTML with mention data attributes
  content_plain TEXT NOT NULL,        -- Plain text for search/preview
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Foreign keys
  CONSTRAINT fk_conversation_notes_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_conversation_notes_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_conversation_notes_created_by
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE SET NULL
);

-- ============================================================================
-- TABLE: mentions
-- Purpose: Track individual @mentions for notifications and read status
-- ============================================================================
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL,
  mentioning_user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ,              -- When user viewed the mention (null = unread)
  email_sent_at TIMESTAMPTZ,          -- When email notification was sent
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Foreign keys
  CONSTRAINT fk_mentions_note
    FOREIGN KEY (note_id)
    REFERENCES conversation_notes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mentions_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mentions_organization
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mentions_mentioned_user
    FOREIGN KEY (mentioned_user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_mentions_mentioning_user
    FOREIGN KEY (mentioning_user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,

  -- One mention record per user per note
  CONSTRAINT uq_mentions_note_user UNIQUE(note_id, mentioned_user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- conversation_notes indexes
CREATE INDEX IF NOT EXISTS idx_conversation_notes_conversation
  ON conversation_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_org
  ON conversation_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_created_by
  ON conversation_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_notes_created_at
  ON conversation_notes(created_at DESC);

-- mentions indexes (optimized for common queries)
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user_unread
  ON mentions(mentioned_user_id)
  WHERE viewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_email_pending
  ON mentions(mentioned_user_id, created_at)
  WHERE email_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_mentions_conversation
  ON mentions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mentions_note
  ON mentions(note_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger for conversation_notes
DROP TRIGGER IF EXISTS update_conversation_notes_updated_at ON conversation_notes;
CREATE TRIGGER update_conversation_notes_updated_at
  BEFORE UPDATE ON conversation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- conversation_notes policies
DROP POLICY IF EXISTS "conversation_notes_select" ON conversation_notes;
CREATE POLICY "conversation_notes_select" ON conversation_notes
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "conversation_notes_insert" ON conversation_notes;
CREATE POLICY "conversation_notes_insert" ON conversation_notes
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "conversation_notes_update" ON conversation_notes;
CREATE POLICY "conversation_notes_update" ON conversation_notes
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "conversation_notes_delete" ON conversation_notes;
CREATE POLICY "conversation_notes_delete" ON conversation_notes
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- mentions policies
DROP POLICY IF EXISTS "mentions_select" ON mentions;
CREATE POLICY "mentions_select" ON mentions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentions_insert" ON mentions;
CREATE POLICY "mentions_insert" ON mentions
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mentions_update" ON mentions;
CREATE POLICY "mentions_update" ON mentions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    -- Users can only update mentions where they are the mentioned user
    AND mentioned_user_id = auth.uid()
  );

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Enable realtime for mentions (for live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE mentions;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE conversation_notes IS 'Internal team notes on conversations with @mention support';
COMMENT ON TABLE mentions IS 'Tracks individual @mentions for notifications and read status';
COMMENT ON COLUMN conversation_notes.content IS 'HTML content with mention data attributes (data-mention-id)';
COMMENT ON COLUMN conversation_notes.content_plain IS 'Plain text version for search and preview display';
COMMENT ON COLUMN mentions.viewed_at IS 'Timestamp when user viewed the mention (null = unread)';
COMMENT ON COLUMN mentions.email_sent_at IS 'Timestamp when email notification was sent (null = not sent)';
