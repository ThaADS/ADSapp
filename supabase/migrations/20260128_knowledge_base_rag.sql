-- Phase 19: Knowledge Base AI (RAG)
-- Database schema for AI knowledge base with document upload and RAG
-- Date: 2026-01-28

-- =============================================================================
-- ENABLE PGVECTOR EXTENSION
-- =============================================================================
-- Required for vector similarity search

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- KNOWLEDGE DOCUMENTS TABLE
-- =============================================================================
-- Stores uploaded documents and URLs for knowledge extraction

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Document info
  title TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url', 'text')),
  -- File info (for uploads)
  file_name TEXT,
  file_type TEXT, -- pdf, docx, txt, md
  file_size_bytes INTEGER,
  storage_path TEXT, -- Supabase Storage path
  -- URL info (for crawled pages)
  source_url TEXT,
  crawled_at TIMESTAMPTZ,
  -- Content extraction
  raw_content TEXT, -- Full extracted text
  content_hash TEXT, -- MD5 hash for deduplication
  word_count INTEGER,
  language TEXT DEFAULT 'en',
  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'chunking', 'embedding', 'completed', 'failed'
  )),
  error_message TEXT,
  -- Embedding info
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  chunks_count INTEGER DEFAULT 0,
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Unique constraint on content hash per org
  UNIQUE(organization_id, content_hash)
);

-- Indexes
CREATE INDEX idx_knowledge_docs_org ON knowledge_documents(organization_id);
CREATE INDEX idx_knowledge_docs_status ON knowledge_documents(status);
CREATE INDEX idx_knowledge_docs_type ON knowledge_documents(source_type);
CREATE INDEX idx_knowledge_docs_tags ON knowledge_documents USING GIN(tags);
CREATE INDEX idx_knowledge_docs_metadata ON knowledge_documents USING GIN(metadata);

-- RLS Policies
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org knowledge documents"
  ON knowledge_documents FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage knowledge documents"
  ON knowledge_documents FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- KNOWLEDGE CHUNKS TABLE
-- =============================================================================
-- Document chunks with vector embeddings for semantic search

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Position in document
  token_count INTEGER NOT NULL,
  -- Vector embedding (1536 dimensions for ada-002)
  embedding vector(1536),
  -- Source location
  start_char INTEGER,
  end_char INTEGER,
  page_number INTEGER, -- For PDFs
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, chunk_index)
);

-- Indexes for vector search
CREATE INDEX idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_org ON knowledge_chunks(organization_id);
-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org knowledge chunks"
  ON knowledge_chunks FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- KNOWLEDGE QUERIES TABLE
-- =============================================================================
-- Log of queries against the knowledge base (for analytics)

CREATE TABLE IF NOT EXISTS knowledge_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Query info
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  -- Results
  chunks_retrieved INTEGER NOT NULL DEFAULT 0,
  top_similarity_score FLOAT,
  context_tokens INTEGER,
  -- AI response
  ai_response TEXT,
  ai_model TEXT,
  ai_tokens_used INTEGER,
  -- Performance
  search_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  -- Source tracking
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN (
    'manual', 'ai_draft', 'ai_auto', 'api'
  )),
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_queries_org ON knowledge_queries(organization_id);
CREATE INDEX idx_knowledge_queries_user ON knowledge_queries(user_id);
CREATE INDEX idx_knowledge_queries_created ON knowledge_queries(created_at DESC);

-- RLS
ALTER TABLE knowledge_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org knowledge queries"
  ON knowledge_queries FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- =============================================================================
-- KNOWLEDGE SETTINGS TABLE
-- =============================================================================
-- Per-organization RAG configuration

CREATE TABLE IF NOT EXISTS knowledge_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  -- Chunking settings
  chunk_size_tokens INTEGER NOT NULL DEFAULT 500,
  chunk_overlap_tokens INTEGER NOT NULL DEFAULT 50,
  -- Retrieval settings
  max_chunks_per_query INTEGER NOT NULL DEFAULT 5,
  similarity_threshold FLOAT NOT NULL DEFAULT 0.7,
  -- AI settings
  ai_model TEXT NOT NULL DEFAULT 'gpt-4-turbo-preview',
  ai_temperature FLOAT NOT NULL DEFAULT 0.3,
  ai_max_tokens INTEGER NOT NULL DEFAULT 1000,
  include_citations BOOLEAN NOT NULL DEFAULT true,
  -- Feature flags
  auto_answer_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_answer_threshold FLOAT NOT NULL DEFAULT 0.85,
  draft_suggestions_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Rate limits
  max_queries_per_day INTEGER NOT NULL DEFAULT 1000,
  max_documents INTEGER NOT NULL DEFAULT 100,
  max_storage_mb INTEGER NOT NULL DEFAULT 500,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE knowledge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org knowledge settings"
  ON knowledge_settings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can manage knowledge settings"
  ON knowledge_settings FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =============================================================================
-- VECTOR SEARCH FUNCTION
-- =============================================================================
-- Semantic search across organization's knowledge base

CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  p_organization_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id AS chunk_id,
    kc.document_id,
    kd.title AS document_title,
    kc.content,
    1 - (kc.embedding <=> p_query_embedding) AS similarity,
    kc.metadata
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kc.organization_id = p_organization_id
    AND kd.status = 'completed'
    AND 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY kc.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DOCUMENT PROCESSING QUEUE TABLE
-- =============================================================================
-- Queue for async document processing

CREATE TABLE IF NOT EXISTS knowledge_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  -- Queue management
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Error tracking
  last_error TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_knowledge_queue_pending ON knowledge_processing_queue(status, priority DESC, scheduled_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_knowledge_queue_doc ON knowledge_processing_queue(document_id);

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_documents_updated_at
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER update_knowledge_settings_updated_at
  BEFORE UPDATE ON knowledge_settings
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_updated_at();

-- =============================================================================
-- INITIALIZE DEFAULT SETTINGS
-- =============================================================================

CREATE OR REPLACE FUNCTION create_default_knowledge_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO knowledge_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default settings when org is created
-- (only if not already triggered by another migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_org_knowledge_settings'
  ) THEN
    CREATE TRIGGER create_org_knowledge_settings
      AFTER INSERT ON organizations
      FOR EACH ROW EXECUTE FUNCTION create_default_knowledge_settings();
  END IF;
END
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE knowledge_documents IS 'Uploaded documents and URLs for knowledge extraction';
COMMENT ON TABLE knowledge_chunks IS 'Document chunks with vector embeddings for semantic search';
COMMENT ON TABLE knowledge_queries IS 'Query log for analytics and debugging';
COMMENT ON TABLE knowledge_settings IS 'Per-organization RAG configuration';
COMMENT ON TABLE knowledge_processing_queue IS 'Async document processing queue';
COMMENT ON FUNCTION search_knowledge_chunks IS 'Semantic search across organization knowledge base';
