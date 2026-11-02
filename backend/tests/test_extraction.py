import pytest
from backend.app.services.extraction_service import extraction_service, PageContent
from backend.app.services.chunking_service import chunking_service

def test_txt_extraction():
    sample_text = "LensIQ is an AI-powered document intelligence application.\nSection 1: Performance metrics."
    pages = extraction_service.extract_txt(sample_text.encode("utf-8"))
    assert len(pages) >= 1
    assert "LensIQ" in pages[0].text
    assert pages[0].page_number == 1

def test_file_validation():
    # Valid file
    ext = extraction_service.validate_file_metadata("sample.pdf", 1024)
    assert ext == "pdf"

    # Unsupported format
    with pytest.raises(Exception):
        extraction_service.validate_file_metadata("malicious.exe", 1024)

    # Exceeding size
    with pytest.raises(Exception):
        extraction_service.validate_file_metadata("oversized.pdf", 25 * 1024 * 1024)

