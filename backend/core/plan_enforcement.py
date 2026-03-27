"""
Plan enforcement utilities.
- Checks paper/download limits per plan
- Resets counters on anniversary date
- Handles trial expiry
"""
from datetime import datetime, timezone
from fastapi import HTTPException
from core.config import settings


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_effective_plan(user: dict) -> str:
    """
    Returns the user's active plan after checking trial/subscription expiry.
    If trial/subscription has expired, returns 'free'.
    """
    plan = user.get("plan", "free")
    if plan == "free":
        return "free"

    trial_active = user.get("trial_active", False)
    sub_end = user.get("subscription_end")

    if sub_end:
        if isinstance(sub_end, str):
            sub_end = datetime.fromisoformat(sub_end)
        if sub_end < _now():
            return "free"  # expired

    if trial_active:
        trial_end = user.get("trial_end")
        if trial_end:
            if isinstance(trial_end, str):
                trial_end = datetime.fromisoformat(trial_end)
            if trial_end < _now():
                return "free"  # trial expired

    return plan


def days_until_expiry(user: dict) -> int:
    """Returns days remaining in subscription/trial. -1 if free."""
    plan = user.get("plan", "free")
    if plan == "free":
        return -1
    sub_end = user.get("subscription_end")
    if not sub_end:
        return -1
    if isinstance(sub_end, str):
        sub_end = datetime.fromisoformat(sub_end)
    delta = sub_end - _now()
    return max(0, delta.days)


def should_reset_counters(user: dict) -> bool:
    """
    For paid plans: reset papers_used and downloads_used on anniversary.
    Anniversary = every period from subscription_start.
    """
    plan = get_effective_plan(user)
    if plan == "free":
        return False

    last_reset = user.get("last_reset_date")
    sub_start = user.get("subscription_start")
    if not last_reset or not sub_start:
        return False

    if isinstance(last_reset, str):
        last_reset = datetime.fromisoformat(last_reset)
    if isinstance(sub_start, str):
        sub_start = datetime.fromisoformat(sub_start)

    now = _now()
    period_days = 365 if plan == "yearly" else 30
    next_reset = last_reset.replace(tzinfo=None) + __import__('datetime').timedelta(days=period_days)
    return now >= next_reset


async def enforce_and_reset(user: dict, db) -> dict:
    """
    Checks if counters need resetting (anniversary).
    If trial expired or subscription expired, drops plan to free.
    Returns updated user dict.
    """
    now = _now()
    updates = {}

    effective = get_effective_plan(user)

    # If plan expired, drop to free
    if effective == "free" and user.get("plan", "free") != "free":
        updates["plan"] = "free"
        updates["trial_active"] = False
        updates["subscription_status"] = "free"
        updates["papers_used"] = 0
        updates["downloads_used"] = 0

    # Anniversary reset for active paid plans
    elif effective != "free" and should_reset_counters(user):
        updates["papers_used"] = 0
        updates["downloads_used"] = 0
        updates["last_reset_date"] = now

    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user = {**user, **updates}

    return user


def check_paper_limit(user: dict):
    """Raises 402 if user has hit their paper generation limit."""
    plan = get_effective_plan(user)
    limits = settings.PLAN_LIMITS.get(plan, settings.PLAN_LIMITS["free"])
    used = user.get("papers_used", 0)
    if used >= limits["papers"]:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "PAPER_LIMIT_REACHED",
                "plan": plan,
                "limit": limits["papers"],
                "used": used,
                "message": f"You have used all {limits['papers']} paper generations for this period."
            }
        )


def check_download_limit(user: dict):
    """Raises 402 if user has hit their download limit."""
    plan = get_effective_plan(user)
    limits = settings.PLAN_LIMITS.get(plan, settings.PLAN_LIMITS["free"])
    used = user.get("downloads_used", 0)
    if used >= limits["downloads"]:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "DOWNLOAD_LIMIT_REACHED",
                "plan": plan,
                "limit": limits["downloads"],
                "used": used,
                "message": f"You have used all {limits['downloads']} downloads for this period."
            }
        )


def check_grade_access(user: dict, grade: str):
    """Raises 403 if free user tries to access grade 11 or 12."""
    plan = get_effective_plan(user)
    limits = settings.PLAN_LIMITS.get(plan, settings.PLAN_LIMITS["free"])
    try:
        grade_num = int(grade)
    except (ValueError, TypeError):
        return
    if grade_num > limits["max_grade"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "GRADE_LOCKED",
                "plan": plan,
                "message": f"Grade {grade} is available on Basic, Pro, and Yearly plans."
            }
        )


def get_usage_stats(user: dict) -> dict:
    """Returns usage stats for the dashboard."""
    plan = get_effective_plan(user)
    limits = settings.PLAN_LIMITS.get(plan, settings.PLAN_LIMITS["free"])
    papers_used = user.get("papers_used", 0)
    downloads_used = user.get("downloads_used", 0)
    expiry_days = days_until_expiry(user)

    return {
        "plan": plan,
        "trial_active": user.get("trial_active", False) and plan != "free",
        "papers_used": papers_used,
        "papers_limit": limits["papers"],
        "papers_remaining": max(0, limits["papers"] - papers_used),
        "downloads_used": downloads_used,
        "downloads_limit": limits["downloads"],
        "downloads_remaining": max(0, limits["downloads"] - downloads_used),
        "days_until_expiry": expiry_days,
        "show_upgrade_banner": expiry_days != -1 and expiry_days <= 5,
        "subscription_end": user.get("subscription_end"),
    }
