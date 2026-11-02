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

# In-memory message store fallback
_local_messages_db = {}

@router.post("/query")
async def stream_query(
    req: ChatQueryRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Executes full RAG query:
    1. Verify daily question quota.
    2. Hybrid retrieval of ready document chunks.
    3. AI synthesis with provider fallback (Gemini -> Groq -> OpenAI).
    4. Streams real-time tokens and verified citations via SSE.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Query content cannot be empty.")
    if not req.selectedDocIds:
        raise HTTPException(status_code=400, detail="At least one document must be attached to ground queries.")

    # 1. Enforce quota
    verify_and_increment_question_quota(user.id)

    # 2. Hybrid Retrieval
    chunks = retrieval_service.search(
        user_id=user.id,
        query=req.content,
        document_ids=req.selectedDocIds
    )

    conv_id = req.conversationId or f"conv_{int(time.time() * 1000)}"

    # 3. Create user message record
    user_msg_id = f"msg_u_{int(time.time() * 1000)}"
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

    # 4. Stream response generator
    async def sse_event_stream():
        accumulated_text = []
        captured_citations = []
        assistant_msg_id = f"msg_a_{int(time.time() * 1000)}"

        try:
            async for event in ai_service.stream_rag_answer(
                query=req.content,
                chunks=chunks,
                preference=req.preference,
                prompt_version=req.prompt_version
            ):
                event_type = event.get("type")
                if event_type == "citations":
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

            # Save to Supabase if connected
            if db.is_connected:
                try:
                    db.client.table("messages").insert([
                        {
                            "id": user_msg_id,
                            "conversation_id": conv_id,
                            "user_id": user.id,
                            "role": "user",
                            "content": req.content,
                            "preference": req.preference,
                            "prompt_version": req.prompt_version,
                            "attached_doc_ids": req.selectedDocIds
                        },
                        {
                            "id": assistant_msg_id,
                            "conversation_id": conv_id,
                            "user_id": user.id,
                            "role": "assistant",
                            "content": full_assistant_text,
                            "preference": req.preference,
                            "prompt_version": req.prompt_version,
                            "attached_doc_ids": req.selectedDocIds,
                            "citations": captured_citations
                        }
                    ]).execute()
                except Exception as e:
                    logger.error(f"Error persisting messages to Supabase: {e}")

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
    """Retrieves all messages for a specific conversation."""
    if db.is_connected:
        try:
            res = db.client.table("messages")\
                .select("*")\
                .eq("conversation_id", conversation_id)\
                .eq("user_id", user.id)\
                .order("created_at", asc=True)\
                .execute()
            msgs = []
            for row in res.data or []:
                msgs.append(ChatMessage(
                    id=str(row["id"]),
                    conversationId=str(row["conversation_id"]),
                    role=row["role"],
                    content=row["content"],
                    createdAt=int(row.get("created_at", time.time())),
                    preference=row.get("preference", "balanced"),
                    prompt_version=row.get("prompt_version", "v2"),
                    attachedDocIds=row.get("attached_doc_ids") or [],
                    citations=[Citation(**c) for c in row.get("citations") or []],
                    feedback=row.get("feedback")
                ))
            return msgs
        except Exception as e:
            logger.error(f"Failed to query messages: {e}")

    # Fallback
    raw_msgs = _local_messages_db.get(conversation_id, [])
    return [ChatMessage(**m) for m in raw_msgs]

@router.post("/messages/{message_id}/feedback")
def set_message_feedback(
    message_id: str,
    req: FeedbackRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Sets user feedback ('like', 'dislike') on an AI assistant response."""
    if db.is_connected:
        try:
            db.client.table("messages").update({"feedback": req.feedback}).eq("id", message_id).eq("user_id", user.id).execute()
        except Exception as e:
            logger.error(f"Failed to set feedback: {e}")

    for conv_msgs in _local_messages_db.values():
        for m in conv_msgs:
            if m["id"] == message_id:
                m["feedback"] = req.feedback
                return {"status": "success", "feedback": req.feedback}

    return {"status": "success", "feedback": req.feedback}

