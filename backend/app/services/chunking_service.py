import re
import logging
from typing import List, Dict, Any
import tiktoken
from backend.app.config import settings
from backend.app.services.extraction_service import PageContent

logger = logging.getLogger(__name__)

class DocumentChunk:
    def __init__(
        self,
        chunk_index: int,
        content: str,
        page_number: int,
        section_title: str = "",
        token_count: int = 0
    ):
        self.chunk_index = chunk_index
        self.content = content
        self.page_number = page_number
        self.section_title = section_title
        self.token_count = token_count

class ChunkingService:
    def __init__(self):
        try:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        except Exception:
            self.tokenizer = None

    def count_tokens(self, text: str) -> int:
        if self.tokenizer:
            return len(self.tokenizer.encode(text, disallowed_special=()))
        return max(1, len(text) // 4)

    def clean_text(self, text: str) -> str:
        # Normalize carriage returns and multiple consecutive spaces
        cleaned = re.sub(r'\r\n?', '\n', text)
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        return cleaned.strip()

    def chunk_pages(
        self,
        pages: List[PageContent],
        chunk_size: int = settings.CHUNK_SIZE,
        chunk_overlap: int = settings.CHUNK_OVERLAP
    ) -> List[DocumentChunk]:
        """
        Chunks page content while strictly preserving page numbers for citations.
        """
        all_chunks: List[DocumentChunk] = []
        global_chunk_idx = 0

        for page in pages:
            raw_text = self.clean_text(page.text)
            if not raw_text:
                continue

            tokens = self.tokenizer.encode(raw_text, disallowed_special=()) if self.tokenizer else []
            total_tokens = len(tokens)

            # If page fits within chunk size, create a single chunk
            if total_tokens <= chunk_size:
                all_chunks.append(DocumentChunk(
                    chunk_index=global_chunk_idx,
                    content=raw_text,
                    page_number=page.page_number,
                    section_title=page.section_title,
                    token_count=total_tokens
                ))
                global_chunk_idx += 1
                continue

            # Sliding window with overlap within the page
            start_idx = 0
            while start_idx < total_tokens:
                end_idx = min(start_idx + chunk_size, total_tokens)
                chunk_slice_tokens = tokens[start_idx:end_idx]
                chunk_text = self.tokenizer.decode(chunk_slice_tokens)

                all_chunks.append(DocumentChunk(
                    chunk_index=global_chunk_idx,
                    content=chunk_text.strip(),
                    page_number=page.page_number,
                    section_title=page.section_title,
                    token_count=len(chunk_slice_tokens)
                ))
                global_chunk_idx += 1

                if end_idx >= total_tokens:
                    break
                start_idx += (chunk_size - chunk_overlap)

        return all_chunks

chunking_service = ChunkingService()

