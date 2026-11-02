import pytest
from zoneinfo import ZoneInfo
from datetime import datetime
from fastapi import HTTPException
from backend.app.core.limits import (
    verify_and_increment_question_quota,
    verify_and_increment_upload_quota,
    get_midnight_reset_info,
    get_or_reset_usage,
    _local_usage_store
)
from backend.app.config import settings

def test_usage_limits_enforcement():
    test_user_id = "test_audit_user_limits"
    
    # Reset store
    _local_usage_store.pop(test_user_id, None)

    # 1. Test Question Limit (20 max)
    for i in range(settings.DAILY_QUESTION_LIMIT):
        verify_and_increment_question_quota(test_user_id)

    # 21st question must raise 429
    with pytest.raises(HTTPException) as exc_info:
        verify_and_increment_question_quota(test_user_id)
    assert exc_info.value.status_code == 429
    assert "Daily question quota exceeded" in str(exc_info.value.detail)
    print("✓ Daily Question Quota (20 questions limit): PASS (429 raised on 21st query)")

    # 2. Test Upload Limit (10 max)
    for i in range(settings.DAILY_UPLOAD_LIMIT):
        verify_and_increment_upload_quota(test_user_id, new_bytes=1000, file_count=1)

    # 11th upload must raise 429
    with pytest.raises(HTTPException) as exc_info:
        verify_and_increment_upload_quota(test_user_id, new_bytes=1000, file_count=1)
    assert exc_info.value.status_code == 429
    assert "Daily upload quota exceeded" in str(exc_info.value.detail)
    print("✓ Daily Upload Quota (10 uploads limit): PASS (429 raised on 11th upload)")

    # 3. Test Total Storage Limit (100 MB max)
    fresh_user = "test_user_storage_cap"
    _local_usage_store.pop(fresh_user, None)
    
    # Attempting to upload 105 MB file
    with pytest.raises(HTTPException) as exc_info:
        verify_and_increment_upload_quota(fresh_user, new_bytes=105 * 1024 * 1024, file_count=1)
    assert exc_info.value.status_code == 413
    assert "Total document storage limit exceeded" in str(exc_info.value.detail)
    print("✓ Total Storage Quota (100 MB limit): PASS (413 raised when exceeding cap)")

    # 4. Test Timezone Midnight Calculation
    for tz_name in ["America/New_York", "Asia/Kolkata", "Europe/London", "UTC"]:
        tz = ZoneInfo(tz_name)
        next_dt, iso_str = get_midnight_reset_info(tz)
        now_tz = datetime.now(tz)
        assert next_dt.hour == 0 and next_dt.minute == 0 and next_dt.second == 0
        assert next_dt.date() > now_tz.date()
        assert tz_name in str(tz) or tz_name == "UTC"
    print("✓ Timezone Midnight Reset Calculation: PASS (Local midnight verified across global zones)")

if __name__ == "__main__":
    test_usage_limits_enforcement()

