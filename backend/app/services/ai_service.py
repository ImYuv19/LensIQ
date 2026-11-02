import time
import json
import asyncio
import logging
from typing import AsyncGenerator, List, Dict, Any, Tuple
import google.generativeai as genai
from groq import Groq
from backend.app.config import settings
from backend.app.services.retrieval_service import RetrievedChunk
from backend.app.models.schemas import Citation

logger = logging.getLogger(__name__)

class AIProviderService:
    """
    RAG AI Synthesis Service with strictly bounded fallback:
    1. Primary: Google Gemini (gemini-1.5-flash)
    2. Fallback: Groq (llama-3.3-70b-versatile)
    Never fabricates answers or returns mock data when providers fail.
    """
    def __init__(self):
        self.gemini_client = None
        self.groq_client = None
        self._init_clients()

    def _init_clients(self):
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_client = genai.GenerativeModel(settings.GEMINI_MODEL)
                logger.info(f"Initialized Gemini primary AI generator ({settings.GEMINI_MODEL})")
            except Exception as e:
                logger.error(f"Failed to init Gemini client: {e}")

        if settings.GROQ_API_KEY:
            try:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info(f"Initialized Groq fallback AI generator ({settings.GROQ_MODEL})")
            except Exception as e:
                logger.error(f"Failed to init Groq client: {e}")

    def build_system_prompt(self, prompt_version: str, preference: str) -> str:
        """
        Builds the system instruction prompt based on version and preference depth.
        """
        depth_instruction = {
            "concise": "Provide a direct, high-density bullet-point answer. Highlight key findings succinctly without extraneous narrative.",
            "balanced": "Provide a well-structured synthesis. Use clear section headers, concise explanations, and supporting evidence references.",
            "detailed": "Provide an exhaustive breakdown. Include cross-document comparisons, explicit parameters, numerical figures, and deep contextual explanations."
        }.get(preference, "Provide a balanced synthesis.")

        version_instruction = {
            "v1": "You are LensIQ, an AI document assistant. Answer questions using only the provided context chunks. Cite sources using [[1]], [[2]].",
            "v2": """You are LensIQ, an elite document intelligence AI created by The Ambitious Lens Studio by uvRaj.
Your core mission is zero-hallucination, evidence-backed knowledge retrieval.
RULES:
1. Ground every statement strictly in the provided retrieved document passages.
2. If information is not contained in the context, explicitly state: "This information was not found in the selected documents."
3. Cite factual claims inline using [[1]], [[2]], etc., matching the provided numbered context citations.
4. Never invent page numbers, document names, or citation numbers that do not exist in the context.
5. Highlight any contradictions or date discrepancies across documents when present.""",
            "v3": """You are LensIQ Advanced Intelligence (V3 multi-document verification engine).
Execute multi-hop reasoning and cross-document reconciliation:
1. Cross-examine all retrieved passages across documents.
2. For each major finding, specify the exact source document, page, and scope.
3. Use bracket citations [[1]], [[2]] tied exclusively to the numbered context.
4. Disclose any extraction ambiguities or missing sections transparently."""
        }.get(prompt_version, "You are LensIQ.")

        return f"{version_instruction}\n\nRESPONSE DEPTH ({preference.upper()}):\n{depth_instruction}"

    def build_context_and_citations(
        self,
        chunks: List[RetrievedChunk]
    ) -> Tuple[str, List[Citation]]:
        """
        Formats retrieved passages into numbered context blocks and constructs
        the corresponding validated Citation records.
        """
        context_blocks = []
        citations: List[Citation] = []

        for idx, chunk in enumerate(chunks):
            citation_num = idx + 1
            citation_id = f"cit_{int(time.time() * 1000)}_{citation_num}"

            citations.append(Citation(
                id=citation_id,
                docId=chunk.document_id,
                docName=chunk.document_name,
                pageNumber=chunk.page_number,
                highlightText=chunk.content[:280].strip(),
                score=chunk.score
            ))

            header = f"[{citation_num}] Document: {chunk.document_name} (Page {chunk.page_number})"
            context_blocks.append(f"{header}\n{chunk.content}\n")

        full_context = "\n---\n".join(context_blocks)
        return full_context, citations

    async def stream_rag_answer(
        self,
        query: str,
        chunks: List[RetrievedChunk],
        preference: str = "balanced",
        prompt_version: str = "v2"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes bounded fallback: Gemini (Primary) -> Groq (Fallback).
        Never returns mock, deterministic, or fabricated answers when providers fail.
        """
        context_text, citations = self.build_context_and_citations(chunks)
        system_instruction = self.build_system_prompt(prompt_version, preference)

        user_prompt = f"""RETRIEVED DOCUMENT CONTEXT:
{context_text}

USER QUESTION:
{query}

Provide a verified, factual response grounded in the context above. Cite using [[1]], [[2]] notation."""

        # Send citations metadata event first
        yield {"type": "citations", "citations": [c.model_dump() for c in citations]}

        # If clients were uninitialized at startup, try refreshing in case keys were added
        if not self.gemini_client and settings.GEMINI_API_KEY:
            self._init_clients()
        if not self.groq_client and settings.GROQ_API_KEY:
            self._init_clients()

        # 1. Primary: Gemini (gemini-1.5-flash)
        if self.gemini_client:
            try:
                logger.info("Generating response with primary provider: Gemini")
                response = self.gemini_client.generate_content(
                    f"{system_instruction}\n\n{user_prompt}",
                    stream=True
                )
                emitted_tokens = False
                for chunk in response:
                    if chunk.text:
                        emitted_tokens = True
                        yield {"type": "text", "content": chunk.text}
                        await asyncio.sleep(0.01)
                if emitted_tokens:
                    yield {"type": "provider", "provider": "gemini"}
                    return
            except Exception as e:
                logger.warning(f"Primary provider (Gemini) failed: {e}. Falling back to Groq.")

        # 2. Fallback: Groq
        if self.groq_client:
            try:
                logger.info("Generating response with fallback provider: Groq")
                completion = self.groq_client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=True
                )
                emitted_tokens = False
                for chunk in completion:
                    delta = chunk.choices[0].delta.content or ""
                    if delta:
                        emitted_tokens = True
                        yield {"type": "text", "content": delta}
                        await asyncio.sleep(0.01)
                if emitted_tokens:
                    yield {"type": "provider", "provider": "groq"}
                    return
            except Exception as e:
                logger.error(f"Fallback provider (Groq) failed: {e}.")

        # 3. Clear Error Reporting: No mock data or hallucinated answers
        error_msg = (
            "AI service unavailable. Primary provider (Gemini) and fallback provider (Groq) "
            "both failed or are unconfigured. Please check GEMINI_API_KEY and GROQ_API_KEY."
        )
        logger.error(error_msg)
        yield {"type": "error", "error": error_msg}

ai_service = AIProviderService()
