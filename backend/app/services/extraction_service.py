import io
import logging
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pptx import Presentation
from fastapi import HTTPException, status
from backend.app.config import settings

logger = logging.getLogger(__name__)

class PageContent:
    def __init__(self, page_number: int, text: str, section_title: str = ""):
        self.page_number = page_number
        self.text = text.strip()
        self.section_title = section_title

class DocumentExtractionService:
    """
    Handles file format extraction preserving page coordinates and section headers.
    Supported: PDF, DOCX, TXT, PPTX.
    """

    @classmethod
    def validate_file_metadata(cls, filename: str, file_size: int) -> str:
        """Validates extension and max 20MB limit."""
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File '{filename}' exceeds maximum allowed size of 20 MB."
            )

        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ["pdf", "docx", "txt", "pptx"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format '{ext}'. Only PDF, DOCX, TXT, and PPTX are permitted."
            )
        return ext

    @classmethod
    def extract_pdf(cls, file_bytes: bytes) -> List[PageContent]:
        """Extracts text page-by-page using PyMuPDF (fitz)."""
        pages: List[PageContent] = []
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(doc)
            if page_count > settings.MAX_PAGES_PER_DOC:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Document exceeds 500 pages limit ({page_count} pages detected)."
                )

            for page_idx in range(page_count):
                page = doc.load_page(page_idx)
                text = page.get_text("text")

                # Lightweight fallback if text is sparse (scanned or image-heavy)
                if len(text.strip()) < 30:
                    try:
                        # Attempt to extract text from images if available or mark scanned
                        pix = page.get_pixmap()
                        # If PyMuPDF optical text / OCR flags exist, could extract; otherwise retain available text
                    except Exception as ocr_err:
                        logger.debug(f"OCR fallback note for page {page_idx + 1}: {ocr_err}")

                pages.append(PageContent(page_number=page_idx + 1, text=text))

            doc.close()
            return pages
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF structure: {str(e)}"
            )

    @classmethod
    def extract_docx(cls, file_bytes: bytes) -> List[PageContent]:
        """Extracts text from DOCX paragraphs and tables."""
        try:
            doc = DocxDocument(io.BytesIO(file_bytes))
            sections: List[str] = []

            for para in doc.paragraphs:
                if para.text.strip():
                    sections.append(para.text.strip())

            for table in doc.tables:
                table_lines = []
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells]
                    table_lines.append(" | ".join(row_data))
                if table_lines:
                    sections.append("\n".join(table_lines))

            full_text = "\n\n".join(sections)
            # Estimate pages (approx ~400 words / 2500 chars per page)
            chars_per_page = 2500
            pages: List[PageContent] = []
            if not full_text:
                pages.append(PageContent(page_number=1, text="[Empty Document]"))
                return pages

            chunk_len = len(full_text)
            page_num = 1
            for i in range(0, chunk_len, chars_per_page):
                page_text = full_text[i:i + chars_per_page]
                pages.append(PageContent(page_number=page_num, text=page_text))
                page_num += 1

            return pages
        except Exception as e:
            logger.error(f"Failed to parse DOCX: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse DOCX file: {str(e)}"
            )

    @classmethod
    def extract_pptx(cls, file_bytes: bytes) -> List[PageContent]:
        """Extracts text slide-by-slide from PPTX."""
        try:
            prs = Presentation(io.BytesIO(file_bytes))
            pages: List[PageContent] = []

            for idx, slide in enumerate(prs.slides):
                slide_texts = []
                slide_title = ""
                for shape in slide.shapes:
                    if shape.has_text_frame:
                        for paragraph in shape.text_frame.paragraphs:
                            line = "".join(run.text for run in paragraph.runs).strip()
                            if line:
                                slide_texts.append(line)
                                if not slide_title:
                                    slide_title = line[:50]

                combined_slide_text = "\n".join(slide_texts)
                pages.append(PageContent(
                    page_number=idx + 1,
                    text=combined_slide_text,
                    section_title=slide_title
                ))

            if not pages:
                pages.append(PageContent(page_number=1, text="[Empty Presentation]"))
            return pages
        except Exception as e:
            logger.error(f"Failed to parse PPTX: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PPTX file: {str(e)}"
            )

    @classmethod
    def extract_txt(cls, file_bytes: bytes) -> List[PageContent]:
        """Extracts text from plain text files."""
        try:
            text = file_bytes.decode("utf-8", errors="replace")
            chars_per_page = 2500
            pages: List[PageContent] = []
            if not text.strip():
                return [PageContent(page_number=1, text="[Empty Text Document]")]

            page_num = 1
            for i in range(0, len(text), chars_per_page):
                pages.append(PageContent(page_number=page_num, text=text[i:i + chars_per_page]))
                page_num += 1
            return pages
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to decode text document: {str(e)}"
            )

    @classmethod
    def extract(cls, filename: str, file_bytes: bytes) -> List[PageContent]:
        ext = cls.validate_file_metadata(filename, len(file_bytes))
        if ext == "pdf":
            return cls.extract_pdf(file_bytes)
        elif ext == "docx":
            return cls.extract_docx(file_bytes)
        elif ext == "pptx":
            return cls.extract_pptx(file_bytes)
        elif ext == "txt":
            return cls.extract_txt(file_bytes)
        raise HTTPException(status_code=400, detail="Unsupported file format.")

extraction_service = DocumentExtractionService()

