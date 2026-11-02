-- LensIQ Local PostgreSQL & pgvector Schema
-- Complete schema for local-first operations

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Local Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    timezone TEXT DEFAULT 'UTC',
    plan_tier TEXT DEFAULT 'Free Plan',
    storage_used_bytes BIGINT DEFAULT 0,
    daily_questions_count INT DEFAULT 0,
    daily_uploads_count INT DEFAULT 0,
    last_quota_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'pptx')),
    size_bytes BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    page_count INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Document Chunks (Vector Store)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    page_number INT DEFAULT 1,
    section_title TEXT,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    selected_doc_ids UUID[] DEFAULT ARRAY[]::UUID[],
    message_count INT DEFAULT 0,
    last_message_snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    preference TEXT DEFAULT 'balanced' CHECK (preference IN ('concise', 'balanced', 'detailed')),
    prompt_version TEXT DEFAULT 'v2' CHECK (prompt_version IN ('v1', 'v2', 'v3')),
    attached_doc_ids UUID[] DEFAULT ARRAY[]::UUID[],
    citations JSONB DEFAULT '[]'::jsonb,
    follow_ups JSONB DEFAULT '[]'::jsonb,
    feedback TEXT CHECK (feedback IN ('like', 'dislike', NULL)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Usage Records (Tracking Token Costs & Limits)
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('question', 'upload', 'extraction')),
    provider_used TEXT CHECK (provider_used IN ('gemini', 'groq', 'openai', 'system')),
    tokens_input INT DEFAULT 0,
    tokens_output INT DEFAULT 0,
    cost_estimate_usd NUMERIC(8, 6) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Document Processing Background Jobs
CREATE TABLE IF NOT EXISTS public.processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    progress INT DEFAULT 0,
    retries INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_user ON public.document_chunks(document_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON public.usage_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.processing_jobs(status, created_at ASC);

-- Full-Text Search GIN Index
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON public.document_chunks USING gin(to_tsvector('english', content));

-- HNSW Vector Index for Cosine Distance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Hybrid Search Function (Vector Cosine + Full-Text Search + RRF)
CREATE OR REPLACE FUNCTION match_document_chunks_hybrid(
    query_text TEXT,
    query_embedding VECTOR(768),
    filter_user_id UUID,
    filter_doc_ids UUID[],
    vector_k INT DEFAULT 10,
    fts_k INT DEFAULT 10,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    content TEXT,
    page_number INT,
    section_title TEXT,
    metadata JSONB,
    similarity_score FLOAT,
    fts_rank FLOAT,
    combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vector_matches AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            c.page_number,
            c.section_title,
            c.metadata,
            (1.0 - (c.embedding <=> query_embedding))::FLOAT AS sim,
            ROW_NUMBER() OVER (ORDER BY (c.embedding <=> query_embedding)) AS rank_vec
        FROM public.document_chunks c
        WHERE c.user_id = filter_user_id
          AND (filter_doc_ids IS NULL OR c.document_id = ANY(filter_doc_ids))
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> query_embedding
        LIMIT vector_k
    ),
    fts_matches AS (
        SELECT 
            c.id,
            c.document_id,
            c.content,
            c.page_number,
            c.section_title,
            c.metadata,
            ts_rank_cd(to_tsvector('english', c.content), websearch_to_tsquery('english', query_text))::FLOAT AS rank_fts_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(to_tsvector('english', c.content), websearch_to_tsquery('english', query_text)) DESC) AS rank_fts
        FROM public.document_chunks c
        WHERE c.user_id = filter_user_id
          AND (filter_doc_ids IS NULL OR c.document_id = ANY(filter_doc_ids))
          AND to_tsvector('english', c.content) @@ websearch_to_tsquery('english', query_text)
        ORDER BY rank_fts_score DESC
        LIMIT fts_k
    ),
    combined AS (
        SELECT 
            COALESCE(v.id, f.id) AS id,
            COALESCE(v.document_id, f.document_id) AS document_id,
            COALESCE(v.content, f.content) AS content,
            COALESCE(v.page_number, f.page_number) AS page_number,
            COALESCE(v.section_title, f.section_title) AS section_title,
            COALESCE(v.metadata, f.metadata) AS metadata,
            COALESCE(v.sim, 0.0)::FLOAT AS sim,
            COALESCE(f.rank_fts_score, 0.0)::FLOAT AS fts_score,
            (COALESCE(1.0 / (rrf_k + v.rank_vec), 0.0) + COALESCE(1.0 / (rrf_k + f.rank_fts), 0.0))::FLOAT AS rrf_score
        FROM vector_matches v
        FULL OUTER JOIN fts_matches f ON v.id = f.id
    )
    SELECT 
        c.id AS chunk_id,
        c.document_id,
        c.content,
        c.page_number,
        c.section_title,
        c.metadata,
        c.sim AS similarity_score,
        c.fts_score AS fts_rank,
        c.rrf_score AS combined_score
    FROM combined c
    ORDER BY c.rrf_score DESC;
END;
$$;

