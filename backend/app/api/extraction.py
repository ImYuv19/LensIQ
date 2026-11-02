import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from backend.app.core.security import get_current_user, AuthenticatedUser
from backend.app.models.schemas import ExtractionRequest, ExtractionResponse
from backend.app.services.table_extraction import table_extraction_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/extraction", tags=["Spreadsheet Extraction"])

@router.post("/preview", response_model=ExtractionResponse)
def preview_extraction(
    req: ExtractionRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Generates preview rows of extracted schema data across selected documents."""
    if not req.documentIds:
        raise HTTPException(status_code=400, detail="At least one document must be selected.")
    if not req.columns:
        raise HTTPException(status_code=400, detail="At least one column definition is required.")

    return table_extraction_service.extract_table(user.id, req)

@router.post("/export/csv")
def export_csv(
    req: ExtractionRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Exports extracted table data as an RFC 4180 compliant CSV file."""
    result = table_extraction_service.extract_table(user.id, req)
    csv_data = table_extraction_service.export_csv(result.columns, result.rows)

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="LensIQ_Document_Extraction.csv"'
        }
    )

@router.post("/export/xlsx")
def export_xlsx(
    req: ExtractionRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Exports extracted table data as a valid OpenXML workbook (.xlsx)."""
    result = table_extraction_service.extract_table(user.id, req)
    xlsx_bytes = table_extraction_service.export_xlsx(result.columns, result.rows)

    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="LensIQ_Document_Extraction.xlsx"'
        }
    )

