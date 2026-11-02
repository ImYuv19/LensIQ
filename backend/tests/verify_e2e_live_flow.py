import json
import time
import requests

BASE_URL = "http://127.0.0.1:8000/api/v1"

# 1. Authenticate / Signup
print("1. Authenticating test user...")
user_email = f"live_verify_{int(time.time())}@lensiq.local"
signup_res = requests.post(
    f"{BASE_URL}/auth/signup",
    json={"email": user_email, "password": "SecurePassword123!", "full_name": "Live Verification User"},
    timeout=10
)
assert signup_res.status_code == 200, f"Signup failed: {signup_res.text}"
token = signup_res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("User authenticated successfully.")

# 2. Upload Document
print("\n2. Uploading document...")
doc_content = (
    "LensIQ Operational SLA Agreement 2026.\n"
    "Section 1: Enterprise Uptime SLA is guaranteed at 99.95% availability.\n"
    "Section 2: Employee Benefits provide a $3,200 annual professional development stipend.\n"
    "Section 3: Parental leave duration is strictly 18 weeks fully compensated by corporate insurance.\n"
    "Section 4: Data residency mandates all vector embeddings reside in local PostgreSQL storage."
)
files = {
    "files": ("LensIQ_Operational_SLA_2026.txt", doc_content.encode("utf-8"), "text/plain")
}
upload_res = requests.post(f"{BASE_URL}/documents/upload", headers=headers, files=files, timeout=10)
assert upload_res.status_code == 200, f"Upload failed: {upload_res.text}"
uploaded_docs = upload_res.json()
doc_id = uploaded_docs[0]["id"]
print(f"Uploaded document ID: {doc_id}")

# 3. Wait for background processing (chunking + live Gemini embeddings)
print("\n3. Waiting for background processing & embedding generation...")
max_wait = 20
is_ready = False
for attempt in range(max_wait):
    time.sleep(1)
    doc_list_res = requests.get(f"{BASE_URL}/documents/", headers=headers, timeout=10)
    if doc_list_res.status_code == 200:
        docs = doc_list_res.json()
        target = next((d for d in docs if d["id"] == doc_id), None)
        if target:
            status = target.get("status")
            print(f"Attempt {attempt+1}: Status = {status}, Progress = {target.get('progress')}%")
            if status == "ready":
                is_ready = True
                print("Document successfully processed and marked ready!")
                break
            elif status == "failed":
                raise RuntimeError(f"Processing failed with error: {target.get('errorMessage')}")

assert is_ready, "Document did not reach 'ready' status in time."

# 4. Stream RAG Chat Query
print("\n4. Submitting RAG query to /chat/query...")
query_payload = {
    "content": "What is the professional development stipend amount and parental leave duration according to the SLA?",
    "selectedDocIds": [doc_id],
    "preference": "balanced",
    "prompt_version": "v2"
}

chat_res = requests.post(
    f"{BASE_URL}/chat/query",
    headers=headers,
    json=query_payload,
    stream=True,
    timeout=45
)
assert chat_res.status_code == 200, f"Chat query request failed: {chat_res.status_code} {chat_res.text}"

citations = []
text_chunks = []
provider_used = None
is_done = False
error_detected = None

for line in chat_res.iter_lines():
    if not line:
        continue
    line_str = line.decode("utf-8")
    if line_str.startswith("data: "):
        payload = json.loads(line_str[6:])
        ev_type = payload.get("type")
        if ev_type == "citations":
            citations = payload.get("citations", [])
            print(f"Received {len(citations)} citations.")
        elif ev_type == "text":
            text_chunks.append(payload.get("content", ""))
        elif ev_type == "provider":
            provider_used = payload.get("provider")
            print(f"Provider reported: {provider_used}")
        elif ev_type == "error":
            error_detected = payload.get("error")
            print(f"Error event received: {error_detected}")
        elif ev_type == "done":
            is_done = True
            print("Stream completed (done event received).")

full_response = "".join(text_chunks)
print("\n=== AI GENERATED ANSWER ===")
print(full_response)
print("===========================")

# 5. Assertions
assert error_detected is None, f"Encountered error during streaming: {error_detected}"
assert provider_used in ["gemini", "groq"], f"Unexpected provider: {provider_used}"
assert provider_used != "deterministic-engine", "Error: deterministic-engine mock returned!"
assert is_done, "Stream did not emit done event."
assert len(citations) > 0, "No citations returned for grounded query."
assert len(full_response.strip()) > 20, "Response too short."
assert ("3,200" in full_response or "$3,200" in full_response or "3200" in full_response), "Missing expected stipend figure from document context!"
assert ("18" in full_response), "Missing expected parental leave duration from document context!"

print("\nLIVE E2E FLOW VERIFIED SUCCESSFULLY WITH REAL AI PROVIDER!")
