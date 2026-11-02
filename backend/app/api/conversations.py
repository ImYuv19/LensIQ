import time
import uuid
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

_local_conversations_db: List[dict] = []

@router.get("/", response_model=List[ConversationItem])
def list_conversations(user: AuthenticatedUser = Depends(get_current_user)):
    """Lists saved conversations for the authenticated user from PostgreSQL."""
    if db.is_connected:
        try:
            rows = db.fetch_all(
                """
                SELECT id, title, selected_doc_ids, message_count, last_message_snippet,
                       EXTRACT(EPOCH FROM created_at) * 1000 AS created_ms,
                       EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_ms
                FROM public.conversations
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (user.id,)
            )
            items = []
            for row in rows or []:
                items.append(ConversationItem(
                    id=str(row["id"]),
                    title=row["title"],
                    createdAt=int(row.get("created_ms") or time.time() * 1000),
                    updatedAt=int(row.get("updated_ms") or time.time() * 1000),
                    selectedDocIds=[str(d) for d in (row.get("selected_doc_ids") or [])],
                    messageCount=row.get("message_count", 0),
                    lastMessageSnippet=row.get("last_message_snippet")
                ))
            return items
        except Exception as e:
            logger.error(f"Error querying conversations: {e}")

    # Fallback
    user_convs = [c for c in _local_conversations_db if c["user_id"] == user.id]
    return [ConversationItem(**c) for c in user_convs]

@router.post("/", response_model=ConversationItem)
def create_conversation(
    req: ConversationCreateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Creates and persists a conversation record in PostgreSQL."""
    conv_id = str(uuid.uuid4())
    title = req.title or "New Conversation"
    now_ms = int(time.time() * 1000)

    if db.is_connected:
        try:
            db.execute(
                """
                INSERT INTO public.conversations (
                    id, user_id, title, selected_doc_ids, message_count
                )
                VALUES (%s, %s, %s, %s, 0)
                """,
                (conv_id, user.id, title, req.selectedDocIds)
            )
        except Exception as e:
            logger.error(f"Error inserting conversation to database: {e}")

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
    return ConversationItem(
        id=conv_id,
        title=title,
        createdAt=now_ms,
        updatedAt=now_ms,
        selectedDocIds=req.selectedDocIds,
        messageCount=0
    )

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
            db.execute(
                """
                UPDATE public.conversations
                SET title = %s, updated_at = NOW()
                WHERE id = %s AND user_id = %s
                """,
                (new_title, conversation_id, user.id)
            )
            row = db.fetch_one(
                """
                SELECT id, title, selected_doc_ids, message_count, last_message_snippet,
                       EXTRACT(EPOCH FROM created_at) * 1000 AS created_ms,
                       EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_ms
                FROM public.conversations
                WHERE id = %s AND user_id = %s
                """,
                (conversation_id, user.id)
            )
            if row:
                return ConversationItem(
                    id=str(row["id"]),
                    title=row["title"],
                    createdAt=int(row.get("created_ms") or time.time() * 1000),
                    updatedAt=int(row.get("updated_ms") or time.time() * 1000),
                    selectedDocIds=[str(d) for d in (row.get("selected_doc_ids") or [])],
                    messageCount=row.get("message_count", 0),
                    lastMessageSnippet=row.get("last_message_snippet")
                )
        except Exception as e:
            logger.error(f"Error renaming conversation: {e}")

    for c in _local_conversations_db:
        if c["id"] == conversation_id and c["user_id"] == user.id:
            c["title"] = new_title
            return ConversationItem(
                id=c["id"],
                title=c["title"],
                createdAt=c["createdAt"],
                updatedAt=c["updatedAt"],
                selectedDocIds=c["selectedDocIds"],
                messageCount=c["messageCount"],
                lastMessageSnippet=c.get("lastMessageSnippet")
            )

    raise HTTPException(status_code=404, detail="Conversation not found or inaccessible.")

@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Deletes a conversation and its messages from PostgreSQL."""
    if db.is_connected:
        try:
            db.execute(
                "DELETE FROM public.conversations WHERE id = %s AND user_id = %s",
                (conversation_id, user.id)
            )
        except Exception as e:
            logger.error(f"Error deleting conversation from database: {e}")

    global _local_conversations_db
    _local_conversations_db = [c for c in _local_conversations_db if not (c["id"] == conversation_id and c["user_id"] == user.id)]
    return {"status": "success", "message": "Conversation deleted."}
