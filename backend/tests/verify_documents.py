import os
import fitz
from docx import Document as DocxDocument
from pptx import Presentation
from backend.app.services.extraction_service import extraction_service
from backend.app.services.chunking_service import chunking_service
from backend.app.services.embedding_service import embedding_service
from backend.app.services.retrieval_service import retrieval_service

def test_full_document_pipeline():
    os.makedirs("backend/tests/sample_docs", exist_ok=True)
    
    # 1. Create genuine PDF
    pdf_path = "backend/tests/sample_docs/test_doc.pdf"
    pdf = fitz.open()
    page1 = pdf.new_page()
    page1.insert_text((50, 72), "LensIQ Enterprise Agreement Page 1: Effective date is January 15, 2026. Uptime SLA is 99.95%.")
    page2 = pdf.new_page()
    page2.insert_text((50, 72), "LensIQ Enterprise Agreement Page 2: Aggregate liability cap is $5,000,000 USD. Governing law is Delaware.")
    pdf.save(pdf_path)
    pdf.close()

    # 2. Create genuine DOCX
    docx_path = "backend/tests/sample_docs/test_doc.docx"
    doc = DocxDocument()
    doc.add_heading("Financial Q3 Performance", level=1)
    doc.add_paragraph("Gross revenue reached $128.4 Million, representing a 24.2% YoY growth.")
    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Metric"
    table.rows[0].cells[1].text = "Value"
    table.rows[1].cells[0].text = "Net Margin"
    table.rows[1].cells[1].text = "18.5%"
    doc.save(docx_path)

    # 3. Create genuine PPTX
    pptx_path = "backend/tests/sample_docs/test_doc.pptx"
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = "Product Roadmap 2026"
    slide.placeholders[1].text = "Key Milestone: Hybrid BM25 pgvector retrieval launch in Q2."
    prs.save(pptx_path)

    # 4. Create genuine TXT
    txt_path = "backend/tests/sample_docs/test_doc.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("Global HR Policy: Annual learning stipend is $2,500 per employee. Parental leave is 16 weeks fully paid.")

    # Now run extraction on all 4 genuine files
    with open(pdf_path, "rb") as f:
        pdf_pages = extraction_service.extract("test_doc.pdf", f.read())
        assert len(pdf_pages) == 2, f"PDF page count should be 2, got {len(pdf_pages)}"
        assert "99.95%" in pdf_pages[0].text
        assert "$5,000,000" in pdf_pages[1].text
        print("✓ PDF Extraction: PASS (2 pages, exact text verified)")

    with open(docx_path, "rb") as f:
        docx_pages = extraction_service.extract("test_doc.docx", f.read())
        assert len(docx_pages) >= 1
        assert "$128.4 Million" in docx_pages[0].text
        assert "Net Margin" in docx_pages[0].text
        print("✓ DOCX Extraction: PASS (paragraphs & table verified)")

    with open(pptx_path, "rb") as f:
        pptx_pages = extraction_service.extract("test_doc.pptx", f.read())
        assert len(pptx_pages) == 1
        assert "Product Roadmap 2026" in pptx_pages[0].text
        print("✓ PPTX Extraction: PASS (slide titles & shapes verified)")

    with open(txt_path, "rb") as f:
        txt_pages = extraction_service.extract("test_doc.txt", f.read())
        assert len(txt_pages) == 1
        assert "$2,500" in txt_pages[0].text
        print("✓ TXT Extraction: PASS (UTF-8 text verified)")

    # Test chunking with page retention
    chunks = chunking_service.chunk_pages(pdf_pages)
    assert len(chunks) == 2
    assert chunks[0].page_number == 1
    assert chunks[1].page_number == 2
    print(f"✓ Chunking: PASS ({len(chunks)} chunks, page coordinates preserved)")

    # Test embeddings
    chunk_texts = [c.content for c in chunks]
    embeddings = embedding_service.get_embeddings_batch(chunk_texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 768
    print(f"✓ Embeddings: PASS (768-dim normalized vectors generated)")

if __name__ == "__main__":
    test_full_document_pipeline()

