# LensIQ Backend — API, RAG Engine & Document Intelligence

Created by **The Ambitious Lens Studio by uvRaj**.

LensIQ is an AI-powered document-based question-answering application. This repository contains the FastAPI backend, hybrid retrieval pipeline (pgvector + FTS), multi-provider LLM fallback (Gemini → Groq → OpenAI), and Supabase PostgreSQL integration.

---

## 1. Architecture Overview

- **Framework**: FastAPI (Python 3.11+)
- **Database**: Supabase PostgreSQL with `pgvector`
- **Authentication & Storage**: Supabase Auth (JWT validation) & Supabase Storage (private document bucket)
- **Document Extractors**:
  - `PyMuPDF` (`fitz`) for PDF
  - `python-docx` for DOCX
  - `python-pptx` for PPTX
  - UTF-8 text processing for TXT
- **Chunking**: Sliding-window recursive tokenizer (`tiktoken`, chunk size: 800 tokens, overlap: 120 tokens) with strict page coordinate preservation
- **Embeddings**: Google Gemini `models/text-embedding-004` (768-dim) stored in `pgvector`
- **Hybrid Retrieval**: Cosine similarity (`<=>`) + PostgreSQL Full-Text Search (`ts_rank_cd`) + Reciprocal Rank Fusion (`RRF k=60`)
- **AI Fallback Orchestration**:
  1. **Primary**: Google Gemini (`gemini-1.5-flash`)
  2. **Backup 1**: Groq (`llama-3.3-70b-versatile`)
  3. **Backup 2**: OpenAI (`gpt-4o-mini`)
- **Streaming**: Server-Sent Events (SSE) streaming real-time tokens and structured citation payloads
- **Spreadsheet Extraction**: Schema-driven multi-document extraction with preview and valid OpenXML `.xlsx` / `.csv` export
- **Usage & Quotas**: Atomic server-side enforcement of 20 questions/day, 10 uploads/day, 100 MB total document storage, resetting at local midnight

---

## 2. Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI application & middleware
│   ├── config.py                # Environment configuration & limits
│   ├── api/
│   │   ├── auth.py              # User profiles & account deletion
│   │   ├── documents.py         # Upload, list, preview, rename, delete
│   │   ├── chat.py              # SSE RAG chat, messages & feedback
│   │   ├── conversations.py     # Conversation history lifecycle
│   │   ├── extraction.py        # Schema extraction preview & XLSX/CSV
│   │   └── usage.py             # Quota statistics & reset countdown
│   ├── core/
│   │   ├── security.py          # Supabase JWT token verification
│   │   ├── database.py          # Supabase client wrapper
│   │   └── limits.py            # Atomic quota checks & timezone reset
│   ├── services/
│   │   ├── extraction_service.py # PDF/DOCX/PPTX/TXT parser
│   │   ├── chunking_service.py   # Token chunker with page metadata
│   │   ├── embedding_service.py  # Gemini text-embedding-004
│   │   ├── retrieval_service.py  # pgvector + FTS + RRF search
│   │   ├── ai_service.py         # Gemini -> Groq -> OpenAI streaming
│   │   ├── table_extraction.py   # Schema table extractor & XLSX generator
│   │   └── background_worker.py  # Async document processing pipeline
│   ├── models/
│   │   └── schemas.py           # Pydantic schemas
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_and_indexes.sql
├── tests/
│   ├── test_extraction.py
│   ├── test_chunking.py
│   └── test_api.py
├── requirements.txt
├── .env.example
├── Dockerfile
└── render.yaml
```

---

## 3. Local Development Setup

### A. Environment Configuration

Copy the example environment file and configure your credentials:

```bash
cp backend/.env.example backend/.env
```

Set:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from your Supabase Project Settings -> API)
- `SUPABASE_JWT_SECRET` (from Supabase Project Settings -> API -> JWT Settings)
- `GEMINI_API_KEY` (from Google AI Studio)
- `GROQ_API_KEY` (from Groq Cloud)
- `OPENAI_API_KEY` (from OpenAI Platform)

### B. Virtual Environment & Dependencies

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

### C. Running Database Migrations

In your Supabase SQL Editor:
1. Run `backend/app/migrations/001_initial_schema.sql` to create tables and extensions.
2. Run `backend/app/migrations/002_rls_and_indexes.sql` to create indexes, hybrid RPC functions, and Row Level Security policies.

### D. Running the Backend Server

```bash
PYTHONPATH=. ./backend/.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The interactive OpenAPI documentation is accessible at: `http://localhost:8000/docs`.

### E. Running Backend Tests

```bash
PYTHONPATH=. ./backend/.venv/bin/pytest backend/tests
```

---

## 4. Production Deployment

- **Backend (Render)**:
  - Connect your GitHub repository to Render.
  - Choose Web Service, select Python environment, set build command: `pip install -r backend/requirements.txt`, and start command: `PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.
  - Add your environment variables in Render Dashboard.
- **Frontend (Vercel)**:
  - Add `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`.
  - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

