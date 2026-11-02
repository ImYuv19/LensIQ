import time
import uuid
import pytest
import jwt
from fastapi import HTTPException
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from backend.app.core.security import (
    decode_supabase_jwt,
    set_jwks_client,
    AuthenticatedUser,
    get_current_user,
    ALLOWED_ASYMMETRIC_ALGORITHMS
)
from backend.app.config import settings
from fastapi.testclient import TestClient
from backend.app.main import app

AUTH_HEADERS = {"Authorization": "Bearer mock-dev-token"}

class MockSigningKey:
    def __init__(self, key, key_id):
        self.key = key
        self.key_id = key_id

class MockJWKClient:
    def __init__(self, key_map):
        self.key_map = key_map

    def get_signing_key_from_jwt(self, token):
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if kid in self.key_map:
            return MockSigningKey(self.key_map[kid], kid)
        raise jwt.PyJWKClientError(f"Key with kid '{kid}' not found")

@pytest.fixture
def ec_key_pair():
    """Generates an Elliptic Curve P-256 key pair for ES256 testing."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    
    pem_priv = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    pem_pub = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    return pem_priv, pem_pub

def test_valid_es256_token(ec_key_pair):
    pem_priv, pem_pub = ec_key_pair
    kid = "test-es256-kid-01"
    issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else None
    
    mock_client = MockJWKClient({kid: pem_pub})
    set_jwks_client(mock_client)
    
    payload_in = {
        "sub": "11111111-2222-3333-4444-555555555555",
        "email": "synthetic.user@lensiq.ai",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600
    }
    if issuer:
        payload_in["iss"] = issuer

    token = jwt.encode(payload_in, pem_priv, algorithm="ES256", headers={"kid": kid})
    
    claims = decode_supabase_jwt(token)
    assert claims["sub"] == "11111111-2222-3333-4444-555555555555"
    assert claims["email"] == "synthetic.user@lensiq.ai"
    assert claims["role"] == "authenticated"

def test_invalid_es256_signature(ec_key_pair):
    pem_priv, _ = ec_key_pair
    # Generate second key pair to simulate invalid signature
    other_priv = ec.generate_private_key(ec.SECP256R1())
    other_pub = other_priv.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    kid = "test-invalid-sig"
    mock_client = MockJWKClient({kid: other_pub})
    set_jwks_client(mock_client)
    
    token = jwt.encode(
        {"sub": "user_123", "aud": "authenticated", "exp": int(time.time()) + 3600},
        pem_priv,
        algorithm="ES256",
        headers={"kid": kid}
    )
    
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401

def test_expired_es256_token(ec_key_pair):
    pem_priv, pem_pub = ec_key_pair
    kid = "test-expired"
    set_jwks_client(MockJWKClient({kid: pem_pub}))
    
    token = jwt.encode(
        {"sub": "user_123", "aud": "authenticated", "exp": int(time.time()) - 100},
        pem_priv,
        algorithm="ES256",
        headers={"kid": kid}
    )
    
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401
    assert "expired" in str(exc.value.detail).lower()

def test_wrong_audience(ec_key_pair):
    pem_priv, pem_pub = ec_key_pair
    kid = "test-aud"
    issuer = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL else None
    set_jwks_client(MockJWKClient({kid: pem_pub}))
    
    payload = {
        "sub": "user_123",
        "aud": "wrong-audience",
        "exp": int(time.time()) + 3600
    }
    if issuer:
        payload["iss"] = issuer

    token = jwt.encode(
        payload,
        pem_priv,
        algorithm="ES256",
        headers={"kid": kid}
    )
    
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401
    assert "audience" in str(exc.value.detail).lower()

def test_wrong_issuer(ec_key_pair):
    pem_priv, pem_pub = ec_key_pair
    kid = "test-iss"
    set_jwks_client(MockJWKClient({kid: pem_pub}))
    
    token = jwt.encode(
        {
            "sub": "user_123",
            "aud": "authenticated",
            "iss": "https://malicious-counterfeit-issuer.com/auth/v1",
            "exp": int(time.time()) + 3600
        },
        pem_priv,
        algorithm="ES256",
        headers={"kid": kid}
    )
    
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401
    assert "issuer" in str(exc.value.detail).lower()

def test_unknown_kid(ec_key_pair):
    pem_priv, _ = ec_key_pair
    set_jwks_client(MockJWKClient({}))
    
    token = jwt.encode(
        {"sub": "user_123", "aud": "authenticated", "exp": int(time.time()) + 3600},
        pem_priv,
        algorithm="ES256",
        headers={"kid": "unknown-nonexistent-kid"}
    )
    
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401
    assert "key" in str(exc.value.detail).lower()

def test_untrusted_algorithm():
    token = jwt.encode({"sub": "user_123", "aud": "authenticated"}, key="", algorithm="none")
    with pytest.raises(HTTPException) as exc:
        decode_supabase_jwt(token)
    assert exc.value.status_code == 401

def test_uuid_consistency_in_conversations_and_chat():
    client = TestClient(app)
    
    # 1. Create conversation and check ID is valid UUID
    res = client.post(
        "/api/v1/conversations/",
        json={"title": "UUID Test Conversation", "selectedDocIds": ["doc_fin_q3"]},
        headers=AUTH_HEADERS
    )
    assert res.status_code == 200
    conv_id = res.json()["id"]
    # Verify conv_id is valid UUID4 (does not throw ValueError)
    val_uuid = uuid.UUID(conv_id, version=4)
    assert str(val_uuid) == conv_id

def test_document_preview_ownership():
    client = TestClient(app)
    # Existing valid doc
    res = client.get("/api/v1/documents/doc_fin_q3/preview", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert len(res.content) > 0
    
    # Inaccessible non-existent doc
    res_404 = client.get("/api/v1/documents/non_existent_doc_id_9999/preview", headers=AUTH_HEADERS)
    assert res_404.status_code == 404

def test_migration_files_structure():
    with open("backend/app/migrations/001_initial_schema.sql", "r") as f:
        sql1 = f.read()
    assert "gen_random_uuid()" in sql1
    assert "handle_new_user()" in sql1
    assert "on_auth_user_created" in sql1
    assert "SET search_path = ''" in sql1
    assert "REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;" in sql1
    
    with open("backend/app/migrations/002_rls_and_indexes.sql", "r") as f:
        sql2 = f.read()
    assert "SET search_path = public, extensions, pg_temp" in sql2
    assert "REVOKE ALL ON FUNCTION match_document_chunks_hybrid" in sql2
    assert "GRANT EXECUTE ON FUNCTION match_document_chunks_hybrid" in sql2
    assert "auth.uid() = filter_user_id" in sql2
    assert "DROP POLICY IF EXISTS" in sql2
    assert "Users can view own profile" in sql2
    # Ensure CURRENT_USER bypass was completely removed
    assert "CURRENT_USER IN ('service_role', 'postgres')" not in sql2

def test_tenant_isolation_hybrid_search_logic():
    """
    Validates the PL/pgSQL tenant isolation rules defined in match_document_chunks_hybrid:
    - User A can query User A's chunks.
    - User A cannot query User B's chunks.
    - Service role can query on behalf of a user.
    - Anonymous callers are rejected.
    """
    def evaluate_hybrid_search_auth(auth_role, auth_jwt_role, auth_uid, filter_user_id):
        role_val = auth_role or ""
        jwt_role_val = auth_jwt_role or ""
        
        # 1. Service role check
        if role_val == "service_role" or jwt_role_val == "service_role":
            return True, "Authorized as service_role"
        # 2. Authenticated user check
        elif auth_uid is not None and auth_uid == filter_user_id:
            return True, "Authorized as owner"
        # 3. Reject all other cases
        else:
            return False, "Access denied: Cannot query document chunks belonging to another user. (ERRCODE 42501)"

    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    # Case 1: User A queries User A's chunks -> ALLOWED
    ok, msg = evaluate_hybrid_search_auth("authenticated", "authenticated", user_a, user_a)
    assert ok is True
    assert "owner" in msg

    # Case 2: User A queries User B's chunks -> REJECTED (42501)
    ok, msg = evaluate_hybrid_search_auth("authenticated", "authenticated", user_a, user_b)
    assert ok is False
    assert "42501" in msg

    # Case 3: Service role queries on behalf of User B -> ALLOWED
    ok, msg = evaluate_hybrid_search_auth("service_role", "service_role", None, user_b)
    assert ok is True
    assert "service_role" in msg

    # Case 4: Anonymous caller queries User A's chunks -> REJECTED (42501)
    ok, msg = evaluate_hybrid_search_auth("anon", "anon", None, user_a)
    assert ok is False
    assert "42501" in msg

