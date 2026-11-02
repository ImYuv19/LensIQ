import logging
import math
from typing import List, Optional
import google.generativeai as genai
from backend.app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Computes 768-dimensional vector embeddings using Google Gemini's models/text-embedding-004.
    Guarantees document embeddings and query embeddings use the exact same model and dimension.
    """
    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER
        self.model_name = settings.EMBEDDING_MODEL  # models/text-embedding-004
        self.dimension = settings.EMBEDDING_DIMENSION  # 768
        self._initialized = False
        self._init_provider()

    def _init_provider(self):
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self._initialized = True
                logger.info(f"Initialized Gemini embedding service using '{self.model_name}' (dimension={self.dimension})")
            except Exception as e:
                logger.error(f"Failed to configure Gemini embeddings: {e}")
                self._initialized = False

    def get_embedding(self, text: str) -> List[float]:
        """Generates 768-dim embedding for a search query using retrieval_query task type."""
        if not text.strip():
            return [0.0] * self.dimension

        if settings.GEMINI_API_KEY:
            try:
                response = genai.embed_content(
                    model=self.model_name,
                    content=text,
                    task_type="retrieval_query",
                    output_dimensionality=self.dimension
                )
                if "embedding" in response:
                    emb = response["embedding"]
                    if emb and isinstance(emb, list) and isinstance(emb[0], (int, float)):
                        return emb
                    elif emb and isinstance(emb, list) and isinstance(emb[0], list):
                        return emb[0]
                raise RuntimeError("Empty embedding returned from Gemini embedding API.")
            except Exception as e:
                logger.error(f"Gemini query embedding failed: {e}")
                raise RuntimeError(f"Gemini query embedding failed: {e}")

        # Offline testing fallback only when no API key is provided
        if settings.DEBUG or settings.MOCK_FALLBACK_MODE:
            return self._generate_pseudo_embedding(text)

        raise RuntimeError("GEMINI_API_KEY is not configured for embedding generation.")

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates 768-dim embeddings for document chunks using retrieval_document task type."""
        if not texts:
            return []

        if settings.GEMINI_API_KEY:
            try:
                results: List[List[float]] = []
                batch_size = 16
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    response = genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document",
                        output_dimensionality=self.dimension
                    )
                    if "embedding" in response:
                        batch_embeddings = response["embedding"]
                        if batch_embeddings and isinstance(batch_embeddings[0], list):
                            results.extend(batch_embeddings)
                        else:
                            results.append(batch_embeddings)
                if len(results) == len(texts):
                    return results
                raise RuntimeError(f"Expected {len(texts)} embeddings, received {len(results)}")
            except Exception as e:
                logger.error(f"Gemini batch document embedding failed: {e}")
                raise RuntimeError(f"Gemini batch document embedding failed: {e}")

        # Offline testing fallback only when no API key is provided
        if settings.DEBUG or settings.MOCK_FALLBACK_MODE:
            return [self._generate_pseudo_embedding(t) for t in texts]

        raise RuntimeError("GEMINI_API_KEY is not configured for embedding generation.")

    def _generate_pseudo_embedding(self, text: str) -> List[float]:
        """Generates a normalized 768-dim pseudo vector for offline unit testing."""
        vec = [0.0] * self.dimension
        words = text.lower().split()
        for idx, word in enumerate(words):
            h = hash(word)
            pos = abs(h) % self.dimension
            vec[pos] += 1.0 / (idx + 1)
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

embedding_service = EmbeddingService()
