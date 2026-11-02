import asyncio
import logging
from typing import Dict, Any, List
from backend.app.core.database import db
from backend.app.services.extraction_service import extraction_service
from backend.app.services.chunking_service import chunking_service
from backend.app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

class BackgroundProcessingWorker:
    """
    Asynchronous document ingestion worker executing:
    Extraction -> Chunking -> Embeddings -> Storage -> Ready status.
    """

    @classmethod
    async def process_document(
        cls,
        doc_id: str,
        user_id: str,
        filename: str,
        file_bytes: bytes
    ):
        logger.info(f"Starting background processing for document: {doc_id} ({filename})")
        
        # 1. Update status to 'processing'
        cls._update_document_status(doc_id, "processing", progress=15)

        try:
            # 2. Extract Pages
            pages = extraction_service.extract(filename, file_bytes)
            page_count = len(pages)
            cls._update_document_status(doc_id, "processing", progress=40, page_count=page_count)
            await asyncio.sleep(0.05)

            # 3. Chunk text with page coordinate retention
            chunks = chunking_service.chunk_pages(pages)
            cls._update_document_status(doc_id, "processing", progress=65)
            await asyncio.sleep(0.05)

            # 4. Generate Embeddings for chunks
            chunk_texts = [c.content for c in chunks]
            embeddings = embedding_service.get_embeddings_batch(chunk_texts)
            cls._update_document_status(doc_id, "processing", progress=85)

            # 5. Store chunks in database
            if db.is_connected:
                chunk_records = []
                for idx, chunk in enumerate(chunks):
                    emb = embeddings[idx] if idx < len(embeddings) else None
                    chunk_records.append({
                        "document_id": doc_id,
                        "user_id": user_id,
                        "chunk_index": chunk.chunk_index,
                        "content": chunk.content,
                        "page_number": chunk.page_number,
                        "section_title": chunk.section_title,
                        "embedding": emb,
                        "metadata": {"token_count": chunk.token_count}
                    })

                # Batch insert chunks
                batch_size = 50
                for i in range(0, len(chunk_records), batch_size):
                    batch = chunk_records[i:i + batch_size]
                    db.client.table("document_chunks").insert(batch).execute()

            # 6. Mark Document as Ready
            summary = pages[0].text[:180].replace("\n", " ").strip() if pages else "Document indexed successfully."
            cls._update_document_status(doc_id, "ready", progress=100, page_count=page_count, summary=summary)
            logger.info(f"Document {doc_id} successfully processed and marked ready.")

        except Exception as e:
            logger.error(f"Processing failed for document {doc_id}: {e}")
            cls._update_document_status(doc_id, "failed", progress=0, error_message=str(e))

    @classmethod
    def _update_document_status(
        cls,
        doc_id: str,
        status: str,
        progress: int = 0,
        page_count: int = None,
        summary: str = None,
        error_message: str = None
    ):
        if db.is_connected:
            try:
                payload = {
                    "status": status,
                    "progress": progress,
                    "error_message": error_message
                }
                if page_count is not None:
                    payload["page_count"] = page_count
                if summary is not None:
                    payload["summary"] = summary

                db.client.table("documents").update(payload).eq("id", doc_id).execute()
            except Exception as e:
                logger.error(f"Failed to update document status in DB: {e}")

background_worker = BackgroundProcessingWorker()

