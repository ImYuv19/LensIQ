import pytest
from backend.app.services.chunking_service import chunking_service
from backend.app.services.extraction_service import PageContent

def test_chunking_with_page_coordinates():
    pages = [
        PageContent(page_number=1, text="Contract provisions and execution bounds for party A."),
        PageContent(page_number=2, text="Financial liabilities and indemnity caps for party B."),
    ]

    chunks = chunking_service.chunk_pages(pages, chunk_size=200, chunk_overlap=30)
    assert len(chunks) == 2
    assert chunks[0].page_number == 1
    assert chunks[1].page_number == 2
    assert "Contract" in chunks[0].content
    assert "Financial" in chunks[1].content

