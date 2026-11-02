import logging
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from backend.app.config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self._client: Optional[Client] = None
        self._is_connected = False
        self._init_client()

    def _init_client(self):
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                self._client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                self._is_connected = True
                logger.info("Successfully connected to Supabase PostgreSQL client.")
            except Exception as e:
                logger.error(f"Failed to connect to Supabase: {e}")
                self._is_connected = False
        else:
            logger.warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Operating in fallback storage mode.")

    @property
    def client(self) -> Optional[Client]:
        if not self._client and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            self._init_client()
        return self._client

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self._client is not None

db = DatabaseService()

