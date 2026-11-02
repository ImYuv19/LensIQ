import logging
from fastapi import APIRouter, Depends
from backend.app.core.security import get_current_user, AuthenticatedUser
from backend.app.models.schemas import UsageStats
from backend.app.config import settings
from backend.app.core.limits import get_or_reset_usage, get_user_timezone, get_midnight_reset_info

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usage", tags=["Usage & Quotas"])

@router.get("/stats", response_model=UsageStats)
def get_usage_stats(user: AuthenticatedUser = Depends(get_current_user)):
    """Returns real-time usage statistics and midnight reset timestamps."""
    usage = get_or_reset_usage(user.id)
    user_tz = get_user_timezone(user.id)
    _, next_reset_iso = get_midnight_reset_info(user_tz)

    q_used = usage.get("daily_questions_count", 0)
    u_used = usage.get("daily_uploads_count", 0)
    s_used = usage.get("storage_used_bytes", 0)

    return UsageStats(
        dailyQuestionsUsed=q_used,
        dailyQuestionsLimit=settings.DAILY_QUESTION_LIMIT,
        dailyUploadsUsed=u_used,
        dailyUploadsLimit=settings.DAILY_UPLOAD_LIMIT,
        storageUsedBytes=s_used,
        storageLimitBytes=settings.MAX_TOTAL_STORAGE_BYTES,
        remainingQuestions=max(0, settings.DAILY_QUESTION_LIMIT - q_used),
        remainingUploads=max(0, settings.DAILY_UPLOAD_LIMIT - u_used),
        nextResetTime=next_reset_iso,
        planTier="LensIQ Free Plan"
    )

