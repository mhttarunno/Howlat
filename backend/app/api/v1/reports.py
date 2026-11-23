from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response

from app.api.deps import DB, CurrentUser
from app.schemas.reporting import MonthlyReport, PeopleReport, ReportSummary, YearlyReport
from app.services import exporter, reports as svc
from app.utils.dates import resolve_range

router = APIRouter(prefix="/reports", tags=["reports"])


def date_range(
    range: Annotated[
        str | None,
        Query(description="today | last_7_days | last_30_days | this_month | last_month | this_year | custom | all"),
    ] = None,
    start: date | None = None,
    end: date | None = None,
) -> tuple[date | None, date | None]:
    return resolve_range(range, start, end)


Range = Annotated[tuple[date | None, date | None], Depends(date_range)]


@router.get("/summary", response_model=ReportSummary)
def summary(db: DB, user: CurrentUser, rng: Range):
    return svc.summary(db, user.id, *rng)


@router.get("/monthly", response_model=MonthlyReport)
def monthly(db: DB, user: CurrentUser, rng: Range):
    return svc.monthly(db, user.id, *rng)


@router.get("/yearly", response_model=YearlyReport)
def yearly(db: DB, user: CurrentUser):
    return svc.yearly(db, user.id)


@router.get("/people", response_model=PeopleReport)
def people(db: DB, user: CurrentUser):
    return svc.people(db, user.id)


MEDIA = {
    "csv": "text/csv; charset=utf-8",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


@router.get("/export", summary="Download a report as CSV, Excel or PDF (generated from live database figures)")
def export(
    db: DB,
    user: CurrentUser,
    rng: Range,
    report: Literal["transactions", "monthly", "yearly", "people", "outstanding", "summary"] = "transactions",
    format: Literal["csv", "xlsx", "pdf"] = "csv",
):
    ds = svc.build_dataset(db, user.id, report, rng[0], rng[1], user.currency)
    if format == "csv":
        body = exporter.to_csv(ds)
    elif format == "xlsx":
        body = exporter.to_xlsx(ds)
    else:
        body = exporter.to_pdf(ds, user.full_name)
    return Response(
        content=body,
        media_type=MEDIA[format],
        headers={"Content-Disposition": f'attachment; filename="howlat-{report}.{format}"', "Cache-Control": "no-store"},
    )
