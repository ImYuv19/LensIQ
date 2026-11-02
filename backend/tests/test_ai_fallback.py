import pytest
from backend.app.services.ai_service import ai_service
from backend.app.services.retrieval_service import RetrievedChunk

@pytest.mark.asyncio
async def test_gemini_to_groq_fallback_simulation():
    chunk = RetrievedChunk(
        chunk_id="test_chk_1",
        document_id="doc_test_1",
        document_name="Test_Policy.txt",
        content="Global Policy: Annual learning stipend is $2,500 per employee. Parental leave is 16 weeks.",
        page_number=1,
        score=0.95
    )

    # 1. Normal execution: primary provider Gemini
    events_primary = []
    async for ev in ai_service.stream_rag_answer(
        query="What is the annual learning stipend?",
        chunks=[chunk],
        preference="concise",
        prompt_version="v2"
    ):
        events_primary.append(ev)

    provider_primary = next((e.get("provider") for e in events_primary if e.get("type") == "provider"), None)
    print("Primary provider used:", provider_primary)
    assert provider_primary in ["gemini", "groq"], f"Expected primary provider 'gemini' (or 'groq' upon quota exhaustion), got '{provider_primary}'"

    # 2. Simulate Gemini failure: Fallback to Groq
    original_gemini_client = ai_service.gemini_client
    
    class FailingGeminiClient:
        def generate_content(self, *args, **kwargs):
            raise RuntimeError("Simulated Gemini network timeout or quota exhaustion.")

    ai_service.gemini_client = FailingGeminiClient()

    try:
        events_fallback = []
        async for ev in ai_service.stream_rag_answer(
            query="What is the annual learning stipend?",
            chunks=[chunk],
            preference="concise",
            prompt_version="v2"
        ):
            events_fallback.append(ev)

        provider_fallback = next((e.get("provider") for e in events_fallback if e.get("type") == "provider"), None)
        print("Fallback provider used:", provider_fallback)
        assert provider_fallback == "groq", f"Expected fallback provider 'groq', got '{provider_fallback}'"

        # Verify actual tokens were streamed from Groq
        groq_text = "".join(e.get("content", "") for e in events_fallback if e.get("type") == "text")
        print(f"Groq streamed response text: {groq_text[:80]}...")
        assert len(groq_text) > 0

    finally:
        ai_service.gemini_client = original_gemini_client

