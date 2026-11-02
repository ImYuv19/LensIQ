import asyncio
from unittest.mock import MagicMock
from backend.app.services.ai_service import ai_service
from backend.app.services.retrieval_service import RetrievedChunk

async def test_provider_fallback_chain():
    chunks = [
        RetrievedChunk(
            chunk_id="chunk_1",
            document_id="doc_1",
            document_name="Agreement.pdf",
            content="Service Level Agreement uptime is 99.95%.",
            page_number=3,
            score=0.9
        )
    ]

    # Scenario 1: Gemini configured but throws error -> Groq takes over
    mock_gemini = MagicMock()
    mock_gemini.generate_content.side_effect = Exception("429 ResourceExhausted: Quota exceeded for gemini-1.5-flash")

    mock_groq = MagicMock()
    mock_choice = MagicMock()
    mock_choice.delta.content = "Groq fallback synthesized response token."
    mock_chunk = MagicMock()
    mock_chunk.choices = [mock_choice]
    mock_groq.chat.completions.create.return_value = [mock_chunk]

    ai_service.gemini_client = mock_gemini
    ai_service.groq_client = mock_groq
    ai_service.openai_client = None

    events = []
    async for e in ai_service.stream_rag_answer("What is the SLA?", chunks):
        events.append(e)

    providers = [e["provider"] for e in events if e.get("type") == "provider"]
    assert providers == ["groq"], f"Expected groq provider, got {providers}"
    text_chunks = [e["content"] for e in events if e.get("type") == "text"]
    assert "Groq fallback" in "".join(text_chunks)
    print("✓ Scenario 1 (Gemini 429 Error -> Groq fallback): PASS")

    # Scenario 2: Gemini throws error AND Groq throws error -> OpenAI takes over
    mock_groq.chat.completions.create.side_effect = Exception("Groq internal server error 503")

    mock_openai = MagicMock()
    mock_oa_choice = MagicMock()
    mock_oa_choice.delta.content = "OpenAI fallback synthesized response token."
    mock_oa_chunk = MagicMock()
    mock_oa_chunk.choices = [mock_oa_choice]
    mock_openai.chat.completions.create.return_value = [mock_oa_chunk]

    ai_service.openai_client = mock_openai

    events = []
    async for e in ai_service.stream_rag_answer("What is the SLA?", chunks):
        events.append(e)

    providers = [e["provider"] for e in events if e.get("type") == "provider"]
    assert providers == ["openai"], f"Expected openai provider, got {providers}"
    text_chunks = [e["content"] for e in events if e.get("type") == "text"]
    assert "OpenAI fallback" in "".join(text_chunks)
    print("✓ Scenario 2 (Gemini + Groq Error -> OpenAI fallback): PASS")

    # Scenario 3: All 3 cloud providers throw error -> Deterministic engine takes over
    mock_openai.chat.completions.create.side_effect = Exception("OpenAI rate limit error 429")

    events = []
    async for e in ai_service.stream_rag_answer("What is the SLA?", chunks):
        events.append(e)

    providers = [e["provider"] for e in events if e.get("type") == "provider"]
    assert providers == ["deterministic-engine"], f"Expected deterministic-engine, got {providers}"
    text_chunks = [e["content"] for e in events if e.get("type") == "text"]
    assert len(text_chunks) > 0
    print("✓ Scenario 3 (All 3 cloud providers fail -> Deterministic safe synthesis): PASS")

if __name__ == "__main__":
    asyncio.run(test_provider_fallback_chain())

