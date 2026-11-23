import uuid
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.deps import DB, CurrentUser, IdempotencyKey
from app.schemas.common import Page
from app.schemas.ledger import (
    EntryType,
    LedgerEntry,
    Status,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.services import entries, ledger
from app.utils.dates import resolve_range

router = APIRouter(prefix="/transactions", tags=["transactions"])


def entry_filters(
    search: Annotated[str | None, Query(max_length=120)] = None,
    type: Annotated[list[EntryType] | None, Query(description="Repeat to include several types")] = None,
    person_id: uuid.UUID | None = None,
    status: Status | None = None,
    range: Annotated[str | None, Query(description="today, last_7_days, last_30_days, this_month, last_month, this_year, custom")] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    overdue: bool = False,
    open: Annotated[bool, Query(description="Only loans that still have an outstanding balance")] = False,
) -> entries.EntryFilters:
    start, end = resolve_range(range, date_from, date_to)
    return entries.EntryFilters(
        search=search,
        entry_types=list(type or []),
        person_id=person_id,
        status=status,
        date_from=start,
        date_to=end,
        overdue_only=overdue,
        open_only=open,
    )


Filters = Annotated[entries.EntryFilters, Depends(entry_filters)]


@router.get(
    "",
    response_model=Page[LedgerEntry],
    summary="Unified ledger: loans and repayments, server-side filtered, sorted and paginated",
)
def list_transactions(
    db: DB,
    user: CurrentUser,
    filters: Filters,
    sort: Literal["date", "amount", "person", "type", "status", "created"] = "date",
    order: Literal["asc", "desc"] = "desc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return entries.list_entries(db, user.id, filters, sort=sort, order=order, page=page, page_size=page_size)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(data: TransactionCreate, db: DB, user: CurrentUser, idempotency_key: IdempotencyKey = None):
    return ledger.create_transaction(db, user.id, data, idempotency_key)


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(transaction_id: uuid.UUID, db: DB, user: CurrentUser):
    return ledger.get_transaction(db, user.id, transaction_id)


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: uuid.UUID, data: TransactionUpdate, db: DB, user: CurrentUser):
    return ledger.update_transaction(db, user.id, transaction_id, data)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(transaction_id: uuid.UUID, db: DB, user: CurrentUser):
    ledger.delete_transaction(db, user.id, transaction_id)
    return Response(status_code=204)
