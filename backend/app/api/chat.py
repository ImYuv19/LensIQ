import json
import time
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from backend.app.core.security import get_current_user, AuthenticatedUser
from backend.app.models.schemas import (
    ChatQueryRequest,
    ChatMessage,
    Citation,
    FeedbackRequest
)
from backend.app.core.database import db
from backend.app.core.limits import verify_and_increment_question_quota
from backend.app.services.retrieval_service import retrieval_service
from backend.app.services.ai_service import ai_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat & RAG"])

_local_messages_db = {}

@router.post("/query")
async def stream_query(
    req: ChatQueryRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Executes full RAG query:
    1. Verify daily question quota.
    2. Hybrid retrieval of ready document chunks from PostgreSQL.
    3. AI synthesis with provider fallback (Gemini -> Groq -> OpenAI).
    4. Streams real-time tokens and verified citations via SSE.
    5. Persists user and assistant messages in PostgreSQL.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Query content cannot be empty.")
    if not req.selectedDocIds:
        raise HTTPException(status_code=400, detail="At least one document must be attached to ground queries.")

    # 1. Enforce quota
    verify_and_increment_question_quota(user.id)

    # 2. Hybrid Retrieval from PostgreSQL pgvector
    chunks = retrieval_service.search(
        user_id=user.id,
        query=req.content,
        document_ids=req.selectedDocIds
    )

    conv_id = req.conversationId or str(uuid.uuid4())

    # Ensure conversation exists in DB
    if db.is_connected:
        try:
            conv = db.fetch_one("SELECT id FROM public.conversations WHERE id = %s", (conv_id,))
            if not conv:
                title_snip = req.content[:35] + ("..." if len(req.content) > 35 else "")
                db.execute(
                    """
                    INSERT INTO public.conversations (id, user_id, title, selected_doc_ids, message_count)
                    VALUES (%s, %s, %s, %s, 0)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (conv_id, user.id, title_snip, req.selectedDocIds)
                )
        except Exception as e:
            logger.error(f"Error ensuring conversation in DB: {e}")

    # 3. Create user message record
    user_msg_id = str(uuid.uuid4())
    user_msg = ChatMessage(
        id=user_msg_id,
        conversationId=conv_id,
        role="user",
        content=req.content,
        createdAt=int(time.time() * 1000),
        preference=req.preference,
        prompt_version=req.prompt_version,
        attachedDocIds=req.selectedDocIds
    )

    if conv_id not in _local_messages_db:
        _local_messages_db[conv_id] = []
    _local_messages_db[conv_id].append(user_msg.model_dump())

    if db.is_connected:
        try:
            db.execute(
                """
                INSERT INTO public.messages (
                    id, conversation_id, user_id, role, content,
                    preference, prompt_version, attached_doc_ids
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_msg_id, conv_id, user.id, "user", req.content,
                    req.preference, req.prompt_version, req.selectedDocIds
                )
            )
        except Exception as e:
            logger.error(f"Failed to record user message: {e}")

    # 4. Stream response generator
    async def sse_event_stream():
        accumulated_text = []
        captured_citations = []
        assistant_msg_id = str(uuid.uuid4())

        try:
            async for event in ai_service.stream_rag_answer(
                query=req.content,
                chunks=chunks,
                preference=req.preference,
                prompt_version=req.prompt_version
            ):
                event_type = event.get("type")
                if event_type == "error":
                    yield f"data: {json.dumps(event)}\n\n"
                    return
                elif event_type == "citations":
                    captured_citations = event.get("citations", [])
                    yield f"data: {json.dumps(event)}\n\n"
                elif event_type == "text":
                    accumulated_text.append(event.get("content", ""))
                    yield f"data: {json.dumps(event)}\n\n"
                elif event_type == "provider":
                    yield f"data: {json.dumps(event)}\n\n"

            # Final assistant message completed
            full_assistant_text = "".join(accumulated_text)
            assistant_msg = ChatMessage(
                id=assistant_msg_id,
                conversationId=conv_id,
                role="assistant",
                content=full_assistant_text,
                createdAt=int(time.time() * 1000),
                preference=req.preference,
                prompt_version=req.prompt_version,
                attachedDocIds=req.selectedDocIds,
                citations=[Citation(**c) for c in captured_citations]
            )
            _local_messages_db[conv_id].append(assistant_msg.model_dump())

            # Save to PostgreSQL
            if db.is_connected:
                try:
                    db.execute(
                        """
                        INSERT INTO public.messages (
                            id, conversation_id, user_id, role, content,
                            preference, prompt_version, attached_doc_ids, citations
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            assistant_msg_id, conv_id, user.id, "assistant",
                            full_assistant_text, req.preference, req.prompt_version,
                            req.selectedDocIds, json.dumps(captured_citations)
                        )
                    )
                    snippet = full_assistant_text[:80].replace("\n", " ").strip()
                    db.execute(
                        """
                        UPDATE public.conversations
                        SET message_count = message_count + 2,
                            last_message_snippet = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (snippet, conv_id)
                    )
                except Exception as e:
                    logger.error(f"Error persisting assistant message to DB: {e}")

            # Send done event
            yield f"data: {json.dumps({'type': 'done', 'messageId': assistant_msg_id})}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(sse_event_stream(), media_type="text/event-stream")

@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessage])
def get_conversation_messages(
    conversation_id: str,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Retrieves all messages for a specific conversation from PostgreSQL."""
    if db.is_connected:
        try:
            rows = db.fetch_all(
                """
                SELECT id, conversation_id, role, content, preference, prompt_version,
                       attached_doc_ids, citations, feedback,
                       EXTRACT(EPOCH FROM created_at) * 1000 AS created_ms
                FROM public.messages
                WHERE conversation_id = %s AND user_id = %s
                ORDER BY created_at ASC
                """,
                (conversation_id, user.id)
            )
            msgs = []
            for row in rows or []:
                raw_cits = row.get("citations") or []
                if isinstance(raw_cits, str):
                    try:
                        raw_cits = json.loads(raw_cits)
                    except Exception:
                        raw_cits = []

                msgs.append(ChatMessage(
                    id=str(row["id"]),
                    conversationId=str(row["conversation_id"]),
                    role=row["role"],
                    content=row["content"],
                    createdAt=int(row.get("created_ms") or time.time() * 1000),
                    preference=row.get("preference", "balanced"),
                    prompt_version=row.get("prompt_version", "v2"),
                    attachedDocIds=[str(d) for d in (row.get("attached_doc_ids") or [])],
                    citations=[Citation(**c) for c in raw_cits],
                    feedback=row.get("feedback")
                ))
            return msgs
        except Exception as e:
            logger.error(f"Failed to query messages from DB: {e}")

    # Fallback
    raw_msgs = _local_messages_db.get(conversation_id, [])
    return [ChatMessage(**m) for m in raw_msgs]

@router.post("/messages/{message_id}/feedback")
def set_message_feedback(
    message_id: str,
    req: FeedbackRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Sets user feedback ('like', 'dislike') on an AI assistant response in PostgreSQL."""
    if db.is_connected:
        try:
            db.execute(
                "UPDATE public.messages SET feedback = %s WHERE id = %s AND user_id = %s",
                (req.feedback, message_id, user.id)
            )
        except Exception as e:
            logger.error(f"Failed to set feedback in DB: {e}")

    for conv_msgs in _local_messages_db.values():
        for m in conv_msgs:
            if m["id"] == message_id:
                m["feedback"] = req.feedback
                return {"status": "success", "feedback": req.feedback}

    return {"status": "success", "feedback": req.feedback}
