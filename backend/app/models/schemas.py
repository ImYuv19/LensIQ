from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

# --- Auth & Profile ---
class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str = ""
    avatar_url: str = ""
    timezone: str = "UTC"
    plan_tier: str = "Free Plan"
    storage_used_bytes: int = 0
    daily_questions_count: int = 0
    daily_uploads_count: int = 0
    last_quota_reset_date: Optional[str] = None
    created_at: Optional[datetime] = None

class SignupRequest(BaseModel):
    email: str = Field(min_length=3, description="User email address")
    password: str = Field(min_length=6, description="Password must be at least 6 characters")
    full_name: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None

class AccountDeleteRequest(BaseModel):
    confirm_text: str = Field(description="Must match 'DELETE' or user email to confirm")

# --- Documents ---
class DocumentItem(BaseModel):
    id: str
    name: str
    type: Literal["pdf", "docx", "txt", "pptx"]
    size: int
    storage_path: Optional[str] = None
    pageCount: Optional[int] = 1
    uploadedAt: int  # Timestamp in ms
    status: Literal["queued", "processing", "ready", "failed"]
    progress: Optional[int] = 0
    errorMessage: Optional[str] = None
    summary: Optional[str] = None

class DocumentRenameRequest(BaseModel):
    name: str

class ProcessingJobResponse(BaseModel):
    id: str
    document_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int = 0
    error_message: Optional[str] = None

# --- Citations & Chat ---
class Citation(BaseModel):
    id: str
    docId: str
    docName: str
    pageNumber: int
    highlightText: str
    score: Optional[float] = None

class ChatMessage(BaseModel):
    id: str
    conversationId: str
    role: Literal["user", "assistant", "system"]
    content: str
    createdAt: int  # ms
    preference: Optional[Literal["concise", "balanced", "detailed"]] = "balanced"
    prompt_version: Optional[Literal["v1", "v2", "v3"]] = "v2"
    attachedDocIds: Optional[List[str]] = []
    citations: Optional[List[Citation]] = []
    followUps: Optional[List[str]] = []
    feedback: Optional[Literal["like", "dislike"]] = None

class ChatQueryRequest(BaseModel):
    conversationId: Optional[str] = None
    content: str
    preference: Literal["concise", "balanced", "detailed"] = "balanced"
    prompt_version: Literal["v1", "v2", "v3"] = "v2"
    selectedDocIds: List[str]

class ConversationItem(BaseModel):
    id: str
    title: str
    createdAt: int  # ms
    updatedAt: int  # ms
    selectedDocIds: List[str] = []
    messageCount: int = 0
    lastMessageSnippet: Optional[str] = None

class ConversationCreateRequest(BaseModel):
    selectedDocIds: List[str] = []
    title: Optional[str] = "New Conversation"

class ConversationRenameRequest(BaseModel):
    title: str

class FeedbackRequest(BaseModel):
    feedback: Optional[Literal["like", "dislike"]] = None

# --- Table Extraction ---
class ExtractionColumn(BaseModel):
    name: str
    description: Optional[str] = ""
    dataType: Literal["text", "number", "date", "boolean", "currency"] = "text"

class ExtractionRequest(BaseModel):
    columns: List[ExtractionColumn]
    documentIds: List[str]
    extractMultipleRowsPerDoc: bool = False

class ExtractionRow(BaseModel):
    docId: str
    docName: str
    data: Dict[str, Any]
    sourceReferences: Dict[str, str]

class ExtractionResponse(BaseModel):
    columns: List[ExtractionColumn]
    rows: List[ExtractionRow]
    totalExtracted: int

# --- Usage & Limits ---
class UsageStats(BaseModel):
    dailyQuestionsUsed: int
    dailyQuestionsLimit: int
    dailyUploadsUsed: int
    dailyUploadsLimit: int
    storageUsedBytes: int
    storageLimitBytes: int
    remainingQuestions: int
    remainingUploads: int
    nextResetTime: str
    planTier: str = "LensIQ Free Plan"

