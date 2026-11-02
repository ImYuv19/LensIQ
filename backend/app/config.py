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
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://*.vercel.app",
    ]

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "documents"

    # AI Provider API Keys
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # AI Model Selection
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Embeddings Configuration
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_MODEL: str = "models/text-embedding-004"
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
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

settings = Settings()
