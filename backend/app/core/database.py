import logging
from typing import Optional, Dict, Any, List, Generator, Union
from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector
from backend.app.config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        self._url = settings.DATABASE_URL
        self._is_connected = False
        self._supabase_client = None
        self._test_connection()
        self._init_supabase_fallback()

    def _test_connection(self):
        if not self._url:
            self._is_connected = False
            return
        try:
            with psycopg.connect(self._url) as conn:
                register_vector(conn)
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                self._is_connected = True
                logger.info("Connected to local PostgreSQL database.")
        except Exception as e:
            logger.warning(f"Local PostgreSQL connection check failed: {e}")
            self._is_connected = False

    def _init_supabase_fallback(self):
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client
                self._supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                logger.info("Supabase client initialized for cloud fallback.")
            except Exception as e:
                logger.debug(f"Supabase client initialization skipped: {e}")

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    @property
    def client(self):
        return self._supabase_client

    @contextmanager
    def get_connection(self) -> Generator[psycopg.Connection, None, None]:
        conn = psycopg.connect(self._url, row_factory=dict_row)
        register_vector(conn)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute(self, query: str, params: Optional[Union[tuple, dict, list]] = None) -> None:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)

    def fetch_one(self, query: str, params: Optional[Union[tuple, dict, list]] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchone()

    def fetch_all(self, query: str, params: Optional[Union[tuple, dict, list]] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                return cur.fetchall()

db = DatabaseService()
