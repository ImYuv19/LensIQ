import logging
from datetime import datetime, time, timedelta
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from backend.app.config import settings
from backend.app.core.database import db

logger = logging.getLogger(__name__)

# Fallback in-memory usage tracking when running without live Supabase
_local_usage_store: Dict[str, Dict[str, Any]] = {}

def get_user_timezone(user_id: str) -> ZoneInfo:
    """Returns the user's configured timezone or defaults to UTC."""
    try:
        if db.is_connected:
            res = db.client.table("profiles").select("timezone").eq("id", user_id).single().execute()
            if res.data and res.data.get("timezone"):
                return ZoneInfo(res.data["timezone"])
    except Exception as e:
        logger.debug(f"Could not fetch user timezone: {e}")
    return ZoneInfo("UTC")

def get_midnight_reset_info(user_tz: ZoneInfo) -> tuple[datetime, str]:
    """Calculates next midnight in user's local timezone and returns ISO string."""
    now_local = datetime.now(user_tz)
    tomorrow = now_local.date() + timedelta(days=1)
    next_midnight = datetime.combine(tomorrow, time.min, tzinfo=user_tz)
    return next_midnight, next_midnight.isoformat()

def get_or_reset_usage(user_id: str) -> Dict[str, Any]:
    """
    Retrieves the user's usage counts, resetting daily counters if past midnight in local timezone.
    """
    user_tz = get_user_timezone(user_id)
    now_local = datetime.now(user_tz)
    today_date_str = str(now_local.date())

    if db.is_connected:
        try:
            profile_res = db.client.table("profiles").select("*").eq("id", user_id).single().execute()
            profile = profile_res.data
            if not profile:
                # Create profile if not existing
                profile = {
                    "id": user_id,
                    "email": "user@lensiq.ai",
                    "timezone": str(user_tz),
                    "storage_used_bytes": 0,
                    "daily_questions_count": 0,
                    "daily_uploads_count": 0,
                    "last_quota_reset_date": today_date_str,
                }
                db.client.table("profiles").insert(profile).execute()
                return profile

            last_reset = profile.get("last_quota_reset_date")
            if last_reset != today_date_str:
                # Reset counters for the new day
                db.client.table("profiles").update({
                    "daily_questions_count": 0,
                    "daily_uploads_count": 0,
                    "last_quota_reset_date": today_date_str,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("id", user_id).execute()
                profile["daily_questions_count"] = 0
                profile["daily_uploads_count"] = 0
                profile["last_quota_reset_date"] = today_date_str

            return profile
        except Exception as e:
            logger.error(f"Error querying user profile usage: {e}")

    # In-memory fallback
    if user_id not in _local_usage_store:
        _local_usage_store[user_id] = {
            "daily_questions_count": 0,
            "daily_uploads_count": 0,
            "storage_used_bytes": 18 * 1024 * 1024, # Mock starting ~18MB
            "last_quota_reset_date": today_date_str,
            "timezone": "UTC"
        }

    entry = _local_usage_store[user_id]
    if entry.get("last_quota_reset_date") != today_date_str:
        entry["daily_questions_count"] = 0
        entry["daily_uploads_count"] = 0
        entry["last_quota_reset_date"] = today_date_str

    return entry

def verify_and_increment_question_quota(user_id: str):
    """
    Atomically verifies that the user has not exceeded the daily question limit.
    """
    usage = get_or_reset_usage(user_id)
    current_questions = usage.get("daily_questions_count", 0)

    if current_questions >= settings.DAILY_QUESTION_LIMIT:
        user_tz = get_user_timezone(user_id)
        _, reset_str = get_midnight_reset_info(user_tz)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Daily question quota exceeded",
                "message": f"You have reached your daily limit of {settings.DAILY_QUESTION_LIMIT} AI questions. Quota resets at midnight ({user_tz}).",
                "reset_at": reset_str,
                "limit": settings.DAILY_QUESTION_LIMIT,
            }
        )

    # Increment
    if db.is_connected:
        try:
            db.client.table("profiles").update({
                "daily_questions_count": current_questions + 1,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Failed to increment question quota: {e}")
    else:
        _local_usage_store[user_id]["daily_questions_count"] = current_questions + 1

def verify_and_increment_upload_quota(user_id: str, new_bytes: int, file_count: int = 1):
    """
    Verifies that the user has not exceeded daily upload limits or total storage limit (100MB).
    """
    usage = get_or_reset_usage(user_id)
    current_uploads = usage.get("daily_uploads_count", 0)
    current_storage = usage.get("storage_used_bytes", 0)

    # 1. Daily upload count limit
    if current_uploads + file_count > settings.DAILY_UPLOAD_LIMIT:
        user_tz = get_user_timezone(user_id)
        _, reset_str = get_midnight_reset_info(user_tz)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Daily upload quota exceeded",
                "message": f"Daily limit of {settings.DAILY_UPLOAD_LIMIT} document uploads reached. Quota resets at midnight ({user_tz}).",
                "reset_at": reset_str,
                "limit": settings.DAILY_UPLOAD_LIMIT,
            }
        )

    # 2. Total storage limit (100 MB)
    if current_storage + new_bytes > settings.MAX_TOTAL_STORAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail={
                "error": "Total document storage limit exceeded",
                "message": f"Uploading this file would exceed your total 100 MB Document Storage quota. Delete old documents to free space.",
                "storage_used_bytes": current_storage,
                "limit_bytes": settings.MAX_TOTAL_STORAGE_BYTES
            }
        )

    # Increment
    if db.is_connected:
        try:
            db.client.table("profiles").update({
                "daily_uploads_count": current_uploads + file_count,
                "storage_used_bytes": current_storage + new_bytes,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Failed to increment upload quota: {e}")
    else:
        _local_usage_store[user_id]["daily_uploads_count"] = current_uploads + file_count
        _local_usage_store[user_id]["storage_used_bytes"] = current_storage + new_bytes

def release_storage(user_id: str, released_bytes: int):
    """Decrements user storage count after a document is deleted."""
    usage = get_or_reset_usage(user_id)
    current_storage = usage.get("storage_used_bytes", 0)
    new_storage = max(0, current_storage - released_bytes)

    if db.is_connected:
        try:
            db.client.table("profiles").update({
                "storage_used_bytes": new_storage,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Failed to release storage: {e}")
    else:
        if user_id in _local_usage_store:
            _local_usage_store[user_id]["storage_used_bytes"] = new_storage

