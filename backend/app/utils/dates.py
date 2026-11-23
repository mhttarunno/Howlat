from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.core.errors import ValidationFailed

PRESETS = ("all", "today", "last_7_days", "last_30_days", "this_month", "last_month", "this_year", "custom")


def today_local() -> date:
    return datetime.now(ZoneInfo(get_settings().app_timezone)).date()


def month_start(d: date) -> date:
    return d.replace(day=1)


def add_months(d: date, n: int) -> date:
    idx = d.year * 12 + (d.month - 1) + n
    return date(idx // 12, idx % 12 + 1, 1)


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def months_between(start: date, end: date) -> list[str]:
    """Inclusive list of YYYY-MM keys from start's month to end's month."""
    out, cur, last = [], month_start(start), month_start(end)
    while cur <= last:
        out.append(month_key(cur))
        cur = add_months(cur, 1)
    return out


def resolve_range(
    preset: str | None, start: date | None, end: date | None, today: date | None = None
) -> tuple[date | None, date | None]:
    """Turns a named preset (or custom dates) into an inclusive (start, end). (None, None) means all time."""
    today = today or today_local()
    preset = preset or ("custom" if (start or end) else "all")
    if preset not in PRESETS:
        raise ValidationFailed(f"Unknown range '{preset}'")
    if preset == "all":
        return None, None
    if preset == "today":
        return today, today
    if preset == "last_7_days":
        return today - timedelta(days=6), today
    if preset == "last_30_days":
        return today - timedelta(days=29), today
    if preset == "this_month":
        return month_start(today), today
    if preset == "last_month":
        first_this = month_start(today)
        return add_months(first_this, -1), first_this - timedelta(days=1)
    if preset == "this_year":
        return date(today.year, 1, 1), today
    # custom
    if start and end and start > end:
        raise ValidationFailed("Start date must be on or before end date")
    return start, end
