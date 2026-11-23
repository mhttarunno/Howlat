"""Unified ledger listing: loans (LENT/BORROWED) and repayments in one filterable, sortable, paginated feed."""

import uuid
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import String, case, cast, func, literal_column, null, select, union_all
from sqlalchemy import Date as SADate
from sqlalchemy.orm import Session

from app.models import Person, Repayment, Transaction
from app.schemas.common import Page
from app.schemas.ledger import LedgerEntry
from app.services.balances import paid_subquery
from app.services.ledger import ref_of
from app.utils.dates import today_local
from app.utils.money import q
from app.utils.sql import escape_like

SORTS = {
    "date": "entry_date",
    "amount": "amount",
    "person": "person_name",
    "type": "entry_type",
    "status": "status",
    "created": "created_at",
}


def _const(s: str):
    # Internal constants only (never user input). literal_column avoids untyped bind params in UNION.
    return literal_column(f"'{s}'")


def entries_subquery(user_id: uuid.UUID):
    paid = paid_subquery(user_id)
    paid_amt = func.coalesce(paid.c.paid, 0)
    outstanding = Transaction.amount - paid_amt
    status = case(
        (outstanding <= 0, _const("FULLY_PAID")),
        (paid_amt <= 0, _const("UNPAID")),
        else_=_const("PARTIALLY_PAID"),
    )

    loans = (
        select(
            Transaction.id.label("id"),
            Transaction.transaction_type.label("entry_type"),
            Transaction.id.label("transaction_id"),
            Transaction.person_id.label("person_id"),
            Person.name.label("person_name"),
            Transaction.amount.label("amount"),
            Transaction.transaction_date.label("entry_date"),
            Transaction.expected_date.label("expected_date"),
            Transaction.description.label("description"),
            Transaction.notes.label("notes"),
            cast(null(), String).label("payment_method"),
            Transaction.amount.label("loan_amount"),
            paid_amt.label("paid_total"),
            outstanding.label("outstanding"),
            status.label("status"),
            Transaction.created_at.label("created_at"),
        )
        .select_from(Transaction)
        .join(Person, Person.id == Transaction.person_id)
        .outerjoin(paid, paid.c.tid == Transaction.id)
        .where(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
    )

    repayments = (
        select(
            Repayment.id.label("id"),
            case(
                (Transaction.transaction_type == "LENT", _const("REPAYMENT_RECEIVED")),
                else_=_const("REPAYMENT_RETURNED"),
            ).label("entry_type"),
            Transaction.id.label("transaction_id"),
            Transaction.person_id.label("person_id"),
            Person.name.label("person_name"),
            Repayment.amount.label("amount"),
            Repayment.repayment_date.label("entry_date"),
            cast(null(), SADate).label("expected_date"),
            Repayment.description.label("description"),
            Repayment.notes.label("notes"),
            Repayment.payment_method.label("payment_method"),
            Transaction.amount.label("loan_amount"),
            paid_amt.label("paid_total"),
            outstanding.label("outstanding"),
            status.label("status"),
            Repayment.created_at.label("created_at"),
        )
        .select_from(Repayment)
        .join(Transaction, Transaction.id == Repayment.transaction_id)
        .join(Person, Person.id == Transaction.person_id)
        .outerjoin(paid, paid.c.tid == Transaction.id)
        .where(
            Repayment.user_id == user_id,
            Repayment.deleted_at.is_(None),
            Transaction.deleted_at.is_(None),
        )
    )
    return union_all(loans, repayments).subquery("entries")


@dataclass
class EntryFilters:
    search: str | None = None
    entry_types: list[str] = field(default_factory=list)
    person_id: uuid.UUID | None = None
    status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    transaction_id: uuid.UUID | None = None
    overdue_only: bool = False
    open_only: bool = False  # loans that still have an outstanding balance


def apply_filters(stmt, u, f: EntryFilters):
    if f.search:
        pat = f"%{escape_like(f.search.strip())}%"
        stmt = stmt.where(
            u.c.description.ilike(pat, escape="\\")
            | u.c.notes.ilike(pat, escape="\\")
            | u.c.person_name.ilike(pat, escape="\\")
            | cast(u.c.id, String).ilike(f"{escape_like(f.search.strip())}%", escape="\\")
        )
    if f.entry_types:
        stmt = stmt.where(u.c.entry_type.in_(f.entry_types))
    if f.person_id:
        stmt = stmt.where(u.c.person_id == f.person_id)
    if f.transaction_id:
        stmt = stmt.where(u.c.transaction_id == f.transaction_id)
    if f.status:
        stmt = stmt.where(u.c.status == f.status)
    if f.date_from:
        stmt = stmt.where(u.c.entry_date >= f.date_from)
    if f.date_to:
        stmt = stmt.where(u.c.entry_date <= f.date_to)
    if f.open_only:
        stmt = stmt.where(u.c.entry_type.in_(["LENT", "BORROWED"]), u.c.outstanding > 0)
    if f.overdue_only:
        stmt = stmt.where(
            u.c.entry_type.in_(["LENT", "BORROWED"]),
            u.c.outstanding > 0,
            u.c.expected_date.is_not(None),
            u.c.expected_date < today_local(),
        )
    return stmt


def _to_entry(r, today: date) -> LedgerEntry:
    is_loan = r.entry_type in ("LENT", "BORROWED")
    return LedgerEntry(
        id=r.id,
        ref=ref_of(r.id),
        entry_type=r.entry_type,
        transaction_id=r.transaction_id,
        person_id=r.person_id,
        person_name=r.person_name,
        amount=q(r.amount),
        entry_date=r.entry_date,
        expected_date=r.expected_date,
        description=r.description,
        notes=r.notes,
        payment_method=r.payment_method,
        loan_amount=q(r.loan_amount),
        paid_total=q(r.paid_total),
        outstanding=q(r.outstanding),
        status=r.status,
        is_overdue=bool(is_loan and r.outstanding > 0 and r.expected_date and r.expected_date < today),
        created_at=r.created_at,
    )


def list_entries(
    db: Session,
    user_id: uuid.UUID,
    f: EntryFilters,
    *,
    sort: str = "date",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> Page[LedgerEntry]:
    u = entries_subquery(user_id)
    total = db.execute(apply_filters(select(func.count()).select_from(u), u, f)).scalar_one()

    col = u.c[SORTS.get(sort, "entry_date")]
    primary = col.asc() if order == "asc" else col.desc()
    stmt = (
        apply_filters(select(u), u, f)
        .order_by(primary, u.c.created_at.desc(), u.c.id)
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    today = today_local()
    items = [_to_entry(r, today) for r in db.execute(stmt)]
    return Page.build(items, total, page, page_size)


def all_entries(db: Session, user_id: uuid.UUID, f: EntryFilters, limit: int = 50000) -> list[LedgerEntry]:
    """Unpaginated (for exports)."""
    u = entries_subquery(user_id)
    stmt = apply_filters(select(u), u, f).order_by(u.c.entry_date.desc(), u.c.created_at.desc(), u.c.id).limit(limit)
    today = today_local()
    return [_to_entry(r, today) for r in db.execute(stmt)]
