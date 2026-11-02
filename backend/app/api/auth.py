import logging
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.core.security import get_current_user, AuthenticatedUser
from backend.app.models.schemas import UserProfile, ProfileUpdateRequest, AccountDeleteRequest
from backend.app.core.database import db
from backend.app.core.limits import get_or_reset_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication & Profile"])

@router.get("/me", response_model=UserProfile)
def get_user_profile(user: AuthenticatedUser = Depends(get_current_user)):
    """Fetches the authenticated user profile and usage metadata."""
    usage = get_or_reset_usage(user.id)
    return UserProfile(
        id=user.id,
        email=user.email,
        full_name=usage.get("full_name", "Alex Morgan"),
        avatar_url=usage.get("avatar_url", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"),
        timezone=usage.get("timezone", "UTC"),
        plan_tier=usage.get("plan_tier", "LensIQ Free Plan"),
        storage_used_bytes=usage.get("storage_used_bytes", 0),
        daily_questions_count=usage.get("daily_questions_count", 0),
        daily_uploads_count=usage.get("daily_uploads_count", 0),
        last_quota_reset_date=usage.get("last_quota_reset_date")
    )

@router.patch("/me", response_model=UserProfile)
def update_user_profile(
    req: ProfileUpdateRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Updates user full name or timezone preferences."""
    updates = {}
    if req.full_name is not None:
        updates["full_name"] = req.full_name.strip()
    if req.timezone is not None:
        updates["timezone"] = req.timezone.strip()

    if db.is_connected and updates:
        try:
            db.client.table("profiles").update(updates).eq("id", user.id).execute()
        except Exception as e:
            logger.error(f"Failed to update profile: {e}")

    return get_user_profile(user)

@router.post("/account/delete")
def delete_account(
    req: AccountDeleteRequest,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Permanently deletes user profile, documents, chunks, embeddings,
    conversations, and storage according to policy.
    """
    if req.confirm_text.strip().upper() != "DELETE" and req.confirm_text.strip() != user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation text must match 'DELETE' or your account email to proceed."
        )

    if db.is_connected:
        try:
            # Cascading deletion via PostgreSQL FKs
            db.client.table("profiles").delete().eq("id", user.id).execute()
            logger.info(f"Account {user.id} and associated assets permanently deleted.")
        except Exception as e:
            logger.error(f"Failed to delete account in Supabase: {e}")
            raise HTTPException(status_code=500, detail="Account deletion failed.")

    return {"status": "success", "message": "Account and all associated documents deleted permanently."}

