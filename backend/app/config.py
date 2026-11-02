from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "LensIQ API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://*.vercel.app",
    ]

    # Database & Storage (Local-First Architecture)
    DATABASE_URL: str = "postgresql://localhost:5432/lensiq_local"
    LOCAL_JWT_SECRET: str = "lensiq-dev-local-jwt-secret-key-32bytes-min!!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    LOCAL_STORAGE_DIR: str = "backend/data/documents"

    # Cloud Supabase (Retained for Cloud Compatibility)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # AI Provider API Keys (Gemini Primary, Groq Generation Fallback)
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # AI Model Selection
    GEMINI_MODEL: str = "models/gemini-3.5-flash"
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    # Embeddings Configuration
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "models/gemini-embedding-001"
    EMBEDDING_DIMENSION: int = 768

    # RAG & Chunking Parameters
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 120
    INITIAL_RETRIEVAL_K: int = 10
    FINAL_RERANK_K: int = 5
    RRF_K: int = 60

    # User Limits
    MAX_FILE_SIZE_BYTES: int = 20 * 1024 * 1024  # 20 MB
    MAX_FILES_PER_BATCH: int = 10
    MAX_PAGES_PER_DOC: int = 500
    MAX_TOTAL_STORAGE_BYTES: int = 100 * 1024 * 1024  # 100 MB per account
    DAILY_QUESTION_LIMIT: int = 20
    DAILY_UPLOAD_LIMIT: int = 10

    # Local fallback mode when testing without live Supabase credentials
    MOCK_FALLBACK_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()
