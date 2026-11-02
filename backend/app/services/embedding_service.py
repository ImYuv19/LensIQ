import logging
import math
from typing import List, Optional
import google.generativeai as genai
from backend.app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.provider = settings.EMBEDDING_PROVIDER
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self._initialized = False
        self._init_provider()

    def _init_provider(self):
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self._initialized = True
                logger.info(f"Initialized Gemini embedding service using '{self.model_name}'")
            except Exception as e:
                logger.error(f"Failed to configure Gemini embeddings: {e}")
                self._initialized = False

    def get_embedding(self, text: str) -> List[float]:
        """Generates embedding for a single text query."""
        embeddings = self.get_embeddings_batch([text])
        return embeddings[0] if embeddings else [0.0] * self.dimension

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for multiple chunks."""
        if not texts:
            return []

        # If Gemini API key is configured
        if settings.GEMINI_API_KEY:
            try:
                # Gemini embed_content batch
                results: List[List[float]] = []
                # Batch in groups of 16 to respect payload limits
                batch_size = 16
                for i in range(0, len(texts), batch_size):
                    batch = texts[i:i + batch_size]
                    response = genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    if "embedding" in response:
                        batch_embeddings = response["embedding"]
                        # When single vs list returned
                        if batch_embeddings and isinstance(batch_embeddings[0], list):
                            results.extend(batch_embeddings)
                        else:
                            results.append(batch_embeddings)
                if len(results) == len(texts):
                    return results
            except Exception as e:
                logger.error(f"Gemini embedding API error: {e}")

        # Deterministic pseudo-embedding for testing or fallback when API key is not supplied
        logger.warning("Generating local deterministic embedding vector for offline testing.")
        return [self._generate_pseudo_embedding(t) for t in texts]

    def _generate_pseudo_embedding(self, text: str) -> List[float]:
        """Generates a normalized 768-dim pseudo vector for testing."""
        vec = [0.0] * self.dimension
        words = text.lower().split()
        for idx, word in enumerate(words):
            h = hash(word)
            pos = abs(h) % self.dimension
            vec[pos] += 1.0 / (idx + 1)
        # Normalize
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

embedding_service = EmbeddingService()

