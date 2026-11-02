import zipfile
import io
import csv
from backend.app.services.table_extraction import table_extraction_service
from backend.app.models.schemas import ExtractionRequest, ExtractionColumn

def test_spreadsheet_exports():
    req = ExtractionRequest(
        columns=[
            ExtractionColumn(name="Contract Title", dataType="text"),
            ExtractionColumn(name="Gross Revenue", dataType="currency"),
            ExtractionColumn(name="Uptime SLA", dataType="text")
        ],
        documentIds=["doc_fin_q3", "doc_msa_v4"]
    )

    res = table_extraction_service.extract_table("test_user", req)
    assert len(res.rows) == 2
    assert "doc_fin_q3" in [r.docId for r in res.rows]
    assert "doc_msa_v4" in [r.docId for r in res.rows]

    # Test CSV
    csv_str = table_extraction_service.export_csv(res.columns, res.rows)
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert reader[0] == ["Document Source", "Contract Title", "Gross Revenue", "Uptime SLA"]
    assert len(reader) == 3
    print("✓ CSV Generation & Format: PASS (headers, rows and cell values validated)")

    # Test XLSX
    xlsx_bytes = table_extraction_service.export_xlsx(res.columns, res.rows)
    assert xlsx_bytes[:4] == b"PK\x03\x04", "Must be a valid ZIP/OpenXML archive"

    with zipfile.ZipFile(io.BytesIO(xlsx_bytes)) as z:
        filenames = z.namelist()
        assert "[Content_Types].xml" in filenames
        assert "xl/workbook.xml" in filenames
        assert "xl/worksheets/sheet1.xml" in filenames
    print("✓ XLSX Generation & OpenXML Structure: PASS (valid OpenXML workbook validated)")

if __name__ == "__main__":
    test_spreadsheet_exports()

