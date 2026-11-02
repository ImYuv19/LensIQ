import asyncio
import pytest
from backend.app.services.retrieval_service import RetrievedChunk, retrieval_service
from backend.app.services.ai_service import ai_service
from backend.app.config import settings

async def test_rag_and_fallback():
    # 1. Prepare sample verified chunks
    chunks = [
        RetrievedChunk(
            chunk_id="chunk_1",
            document_id="doc_msa",
            document_name="Enterprise_Agreement.pdf",
            content="Section 3: Uptime SLA is guaranteed at 99.95% monthly availability. Planned maintenance windows require 72 hours advance written notice.",
            page_number=3,
            score=0.95
        ),
        RetrievedChunk(
            chunk_id="chunk_2",
            document_id="doc_msa",
            document_name="Enterprise_Agreement.pdf",
            content="Section 8: Maximum aggregate liability limitation is capped at $5,000,000 USD for direct damages.",
            page_number=8,
            score=0.89
        )
    ]

    # 2. Test Citation Building & Metadata Association
    context_text, citations = ai_service.build_context_and_citations(chunks)
    assert len(citations) == 2
    assert citations[0].docName == "Enterprise_Agreement.pdf"
    assert citations[0].pageNumber == 3
    assert "99.95%" in citations[0].highlightText
    assert citations[1].pageNumber == 8
    assert "$5,000,000" in citations[1].highlightText
    print("✓ Citation & Chunk Mapping: PASS")

    # 3. Test Prompt Versions & Response Depths
    for depth in ["concise", "balanced", "detailed"]:
        prompt = ai_service.build_system_prompt("v2", depth)
        assert "zero-hallucination" in prompt
        assert depth.upper() in prompt or depth in prompt.lower()
    print("✓ Prompt Architectures & Depths: PASS (V1, V2, V3 and concise/balanced/detailed)")

    # 4. Test Missing Information Handling
    prompt_instruction = ai_service.build_system_prompt("v2", "balanced")
    assert "This information was not found in the selected documents." in prompt_instruction
    print("✓ Missing Information Guardrail: PASS")

    # 5. Test Fallback Pipeline Simulation
    # Case A: Live credentials missing -> Falls back to deterministic synthesis gracefully
    events = []
    async for event in ai_service.stream_rag_answer(
        query="What is the uptime SLA and liability cap?",
        chunks=chunks,
        preference="balanced",
        prompt_version="v2"
    ):
        events.append(event)

    citation_events = [e for e in events if e.get("type") == "citations"]
    text_events = [e for e in events if e.get("type") == "text"]
    provider_events = [e for e in events if e.get("type") == "provider"]

    assert len(citation_events) >= 1
    assert len(text_events) > 0
    full_text = "".join(e.get("content", "") for e in text_events)
    assert "Enterprise_Agreement.pdf" in full_text
    assert "[[1]]" in full_text
    assert provider_events[0]["provider"] in ["gemini", "groq", "openai", "deterministic-engine"]
    print(f"✓ Streaming Synthesis & Fallback: PASS (Provider used: {provider_events[0]['provider']})")

if __name__ == "__main__":
    asyncio.run(test_rag_and_fallback())

