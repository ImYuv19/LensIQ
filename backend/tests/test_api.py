import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer mock-dev-token"}

def test_healthz_endpoint():
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "The Ambitious Lens Studio by uvRaj" in data["creator"]

def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "LensIQ API"

def test_unauthorized_access():
    # Calling protected endpoint without header returns 401 when DEBUG/mock mode is restricted or verified
    res = client.get("/api/v1/auth/me", headers={"Authorization": "InvalidHeaderFormat"})
    assert res.status_code == 401

def test_get_user_profile():
    res = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "email" in data
    assert data["plan_tier"] == "LensIQ Free Plan"

def test_list_documents():
    res = client.get("/api/v1/documents/", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_list_conversations():
    res = client.get("/api/v1/conversations/", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

def test_usage_stats():
    res = client.get("/api/v1/usage/stats", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["dailyQuestionsLimit"] == 20
    assert data["dailyUploadsLimit"] == 10
    assert data["planTier"] == "LensIQ Free Plan"

def test_extraction_preview_and_export():
    payload = {
        "columns": [
            {"name": "Contract Title", "dataType": "text"},
            {"name": "Gross Revenue", "dataType": "currency"}
        ],
        "documentIds": ["doc_fin_q3"],
        "extractMultipleRowsPerDoc": False
    }
    # Preview
    preview_res = client.post("/api/v1/extraction/preview", json=payload, headers=AUTH_HEADERS)
    assert preview_res.status_code == 200
    preview_data = preview_res.json()
    assert len(preview_data["rows"]) == 1

    # CSV Export
    csv_res = client.post("/api/v1/extraction/export/csv", json=payload, headers=AUTH_HEADERS)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Gross Revenue" in csv_res.text

    # XLSX Export
    xlsx_res = client.post("/api/v1/extraction/export/xlsx", json=payload, headers=AUTH_HEADERS)
    assert xlsx_res.status_code == 200
    assert len(xlsx_res.content) > 100
