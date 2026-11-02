-- LensIQ Database Schema Migration 002
-- Indexes, Full-Text Search, Vector Matching & Row-Level Security

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_user ON public.document_chunks(document_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON public.usage_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.processing_jobs(status, created_at ASC);

-- 2. Full-Text Search Index (GIN)
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON public.document_chunks USING gin(to_tsvector('english', content));

-- 3. HNSW Vector Index for Cosine Distance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Hybrid Search Function (Vector Cosine + Full-Text Search + RRF)
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
SECURITY DEFINER
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
            1.0 - (c.embedding <=> query_embedding) AS sim,
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
            ts_rank_cd(to_tsvector('english', c.content), websearch_to_tsquery('english', query_text)) AS rank_fts_score,
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
            COALESCE(v.sim, 0.0) AS sim,
            COALESCE(f.rank_fts_score, 0.0) AS fts_score,
            (COALESCE(1.0 / (rrf_k + v.rank_vec), 0.0) + COALESCE(1.0 / (rrf_k + f.rank_fts), 0.0)) AS rrf_score
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
        c.sim::FLOAT AS similarity_score,
        c.fts_score::FLOAT AS fts_rank,
        c.rrf_score::FLOAT AS combined_score
    FROM combined c
    ORDER BY c.rrf_score DESC;
END;
$$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (User Isolation)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chunks" ON public.document_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own usage records" ON public.usage_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own processing jobs" ON public.processing_jobs FOR ALL USING (auth.uid() = user_id);

-- 7. Supabase Storage Bucket Setup (Private Document Bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload documents to private folder" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

