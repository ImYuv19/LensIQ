import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import hash_password, verify_password, create_access_token

client = TestClient(app)

def test_password_hashing():
    pw = "SuperSecretPassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_local_jwt_generation_and_validation():
    uid = str(uuid.uuid4())
    email = "local_dev@lensiq.test"
    token = create_access_token(user_id=uid, email=email)
    
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == uid
    assert data["email"] == email

def test_user_signup_and_login_flow():
    test_email = f"user_{uuid.uuid4().hex[:8]}@lensiq.test"
    password = "TestPassword456!"
    
    # Signup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": test_email, "password": password, "full_name": "Test Runner"}
    )
    assert signup_res.status_code == 200
    signup_data = signup_res.json()
    assert "access_token" in signup_data
    token = signup_data["access_token"]
    user_id = signup_data["user"]["id"]
    
    # Login with valid password
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": password}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data
    assert login_data["user"]["id"] == user_id
    
    # Login with invalid password
    bad_login_res = client.post(
        "/api/v1/auth/login",
        json={"email": test_email, "password": "incorrect_password"}
    )
    assert bad_login_res.status_code == 401

def test_tenant_document_isolation():
    # User A registers
    email_a = f"usera_{uuid.uuid4().hex[:8]}@lensiq.test"
    res_a = client.post("/api/v1/auth/signup", json={"email": email_a, "password": "PasswordA123!", "full_name": "User A"})
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B registers
    email_b = f"userb_{uuid.uuid4().hex[:8]}@lensiq.test"
    res_b = client.post("/api/v1/auth/signup", json={"email": email_b, "password": "PasswordB123!", "full_name": "User B"})
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A uploads a document
    upload_res = client.post(
        "/api/v1/documents/upload",
        headers=headers_a,
        files=[("files", ("private_contract.txt", b"Confidential financial data of User A", "text/plain"))]
    )
    assert upload_res.status_code == 200
    docs = upload_res.json()
    assert len(docs) == 1
    doc_id = docs[0]["id"]

    # User A can preview their document
    preview_a = client.get(f"/api/v1/documents/{doc_id}/preview", headers=headers_a)
    assert preview_a.status_code == 200
    assert b"Confidential" in preview_a.content

    # User B CANNOT preview User A's document (Strict tenant isolation)
    preview_b = client.get(f"/api/v1/documents/{doc_id}/preview", headers=headers_b)
    assert preview_b.status_code == 404

def test_unauthenticated_requests_rejected():
    """Verify that requests without Authorization header are strictly rejected with 401."""
    res_docs = client.get("/api/v1/documents/")
    assert res_docs.status_code == 401

    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401

def test_google_auth_validation():
    """Verify Google OAuth endpoint rejects missing and invalid ID tokens."""
    # Missing/empty token
    res_empty = client.post("/api/v1/auth/google", json={"id_token": ""})
    assert res_empty.status_code == 400

    # Invalid / fabricated token
    res_invalid = client.post("/api/v1/auth/google", json={"id_token": "fake-google-jwt-token-12345"})
    assert res_invalid.status_code == 401


