from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DB, CurrentUser
from app.schemas.common import Page
from app.schemas.ledger import LedgerEntry
from app.schemas.reporting import DashboardCharts, DashboardSummary, Notifications
from app.services import dashboard as svc
from app.services import entries
from app.services.notifications import get_notifications

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def summary(db: DB, user: CurrentUser):
    return svc.get_summary(db, user.id)


@router.get("/dashboard/recent-activity", response_model=Page[LedgerEntry])
def recent_activity(db: DB, user: CurrentUser, limit: Annotated[int, Query(ge=1, le=50)] = 10):
    return entries.list_entries(
        db, user.id, entries.EntryFilters(), sort="created", order="desc", page=1, page_size=limit
    )


@router.get("/dashboard/charts", response_model=DashboardCharts)
def charts(db: DB, user: CurrentUser, months: Annotated[int, Query(ge=1, le=36)] = 12):
    return svc.get_charts(db, user.id, months)


@router.get("/notifications", response_model=Notifications, summary="Overdue and upcoming repayment reminders")
def notifications(db: DB, user: CurrentUser, window_days: Annotated[int, Query(ge=0, le=60)] = 7):
    return get_notifications(db, user.id, window_days)
