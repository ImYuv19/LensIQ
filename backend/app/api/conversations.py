import time
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.security import get_current_user, AuthenticatedUser
from backend.app.models.schemas import (
    ConversationItem,
    ConversationCreateRequest,
    ConversationRenameRequest
)
from backend.app.core.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["Conversations"])

_local_conversations_db: List[dict] = [
    {
        "id": "conv_q3_rev",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Q3 Financial Health & Revenue Growth",
        "selectedDocIds": ["doc_fin_q3"],
        "messageCount": 2,
        "lastMessageSnippet": "Audited quarterly operational revenue, EBITDA margins, and cash...",
        "createdAt": int(time.time() * 1000) - 3600000,
        "updatedAt": int(time.time() * 1000) - 1800000
    },
    {
        "id": "conv_msa_terms",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Enterprise MSA SLA & Liability Clauses",
        "selectedDocIds": ["doc_msa_v4"],
        "messageCount": 4,
        "lastMessageSnippet": "Master enterprise service agreement covering mutual indemnification...",
        "createdAt": int(time.time() * 1000) - 7200000,
        "updatedAt": int(time.time() * 1000) - 3600000
    },
    {
        "id": "conv_vector_bm25",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Vector Search Indexing & BM25 Fusion",
        "selectedDocIds": ["doc_vec_arch"],
        "messageCount": 2,
        "lastMessageSnippet": "Technical deep dive on pgvector index partitioning, HNSW graph...",
        "createdAt": int(time.time() * 1000) - 86400000,
        "updatedAt": int(time.time() * 1000) - 82800000
    },
    {
        "id": "conv_hr_benefits",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "title": "Parental Leave & Education Stipend",
        "selectedDocIds": ["doc_benefits"],
        "messageCount": 2,
        "lastMessageSnippet": "Employee policies covering medical coverage, parental leaves...",
        "createdAt": int(time.time() * 1000) - 172800000,
        "updatedAt": int(time.time() * 1000) - 171000000
    }
]

@router.get("/", response_model=List[ConversationItem])
def list_conversations(user: AuthenticatedUser = Depends(get_current_user)):
    """Lists saved conversations for the authenticated user."""
    if db.is_connected:
        try:
            res = db.client.table("conversations")\
                .select("*")\
                .eq("user_id", user.id)\
                .order("updated_at", desc=True)\
                .execute()
            items = []
            for row in res.data or []:
                items.append(ConversationItem(
                    id=str(row["id"]),
                    title=row["title"],
                    createdAt=int(row.get("created_at", time.time())),
                    updatedAt=int(row.get("updated_at", time.time())),
                    selectedDocIds=row.get("selected_doc_ids") or [],
                    messageCount=row.get("message_count", 0),
                    lastMessageSnippet=row.get("last_message_snippet")
                ))
            return items
        except Exception as e:
            logger.error(f"Error querying conversations: {e}")

    # Fallback
    user_convs = [c for c in _local_conversations_db if c["user_id"] == user.id or c["user_id"] == "00000000-0000-0000-0000-000000000001"]
    return [ConversationItem(**c) for c in user_convs]

@router.post("/", response_model=ConversationItem)
def create_conversation(
    req: ConversationCreateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates and persists a conversation record (called when the first message is sent)."""
    conv_id = f"conv_{int(time.time() * 1000)}"
    title = req.title or "New Conversation"
    now_ms = int(time.time() * 1000)

    if db.is_connected:
        try:
            db.client.table("conversations").insert({
                "id": conv_id,
                "user_id": user.id,
                "title": title,
                "selected_doc_ids": req.selectedDocIds,
                "message_count": 0
            }).execute()
        except Exception as e:
            logger.error(f"Error inserting conversation to Supabase: {e}")

    entry = {
        "id": conv_id,
        "user_id": user.id,
        "title": title,
        "selectedDocIds": req.selectedDocIds,
        "messageCount": 0,
        "createdAt": now_ms,
        "updatedAt": now_ms
    }
    _local_conversations_db.insert(0, entry)
    return ConversationItem(**entry)

@router.patch("/{conversation_id}", response_model=ConversationItem)
def rename_conversation(
    conversation_id: str,
    req: ConversationRenameRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Renames an existing conversation."""
    new_title = req.title.strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty.")

    if db.is_connected:
        try:
            db.client.table("conversations").update({"title": new_title}).eq("id", conversation_id).eq("user_id", user.id).execute()
        except Exception as e:
            logger.error(f"Error renaming conversation: {e}")

    for c in _local_conversations_db:
        if c["id"] == conversation_id:
            c["title"] = new_title
            return ConversationItem(**c)

    raise HTTPException(status_code=404, detail="Conversation not found.")

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a conversation and its messages."""
    if db.is_connected:
        try:
            db.client.table("conversations").delete().eq("id", conversation_id).eq("user_id", user.id).execute()
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")

    global _local_conversations_db
    _local_conversations_db = [c for c in _local_conversations_db if c["id"] != conversation_id]
    return {"status": "success", "message": "Conversation deleted."}

