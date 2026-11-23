"""Period aggregation shared by dashboard charts and every report, so their figures always agree.

Loans are bucketed by transaction_date; repayments by repayment_date.
"""

import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal

from sqlalchemy import case, func, literal_column, select
from sqlalchemy.orm import Session

from app.models import BORROWED, LENT, Repayment, Transaction
from app.utils.money import ZERO, q

Bucket = Literal["month", "year"] | None


@dataclass
class Flow:
    lent: Decimal = ZERO
    borrowed: Decimal = ZERO
    received: Decimal = ZERO  # repayments received on money I lent
    returned: Decimal = ZERO  # repayments I returned on money I borrowed
    loan_count: int = 0
    repayment_count: int = 0


def _key(col, bucket: Bucket):
    if bucket == "month":
        return func.to_char(col, literal_column("'YYYY-MM'"))
    if bucket == "year":
        return func.to_char(col, literal_column("'YYYY'"))
    return literal_column("'total'")


def period_flows(
    db: Session, user_id: uuid.UUID, start: date | None, end: date | None, bucket: Bucket = None
) -> dict[str, Flow]:
    out: dict[str, Flow] = {}

    # --- loans
    lk = _key(Transaction.transaction_date, bucket).label("k")
    loans = (
        select(
            lk,
            func.coalesce(func.sum(case((Transaction.transaction_type == LENT, Transaction.amount), else_=0)), 0).label("lent"),
            func.coalesce(func.sum(case((Transaction.transaction_type == BORROWED, Transaction.amount), else_=0)), 0).label("borrowed"),
            func.count(Transaction.id).label("n"),
        )
        .where(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
    )
    if bucket:  # no bucket => one aggregate row over everything (a constant can't be a GROUP BY key)
        loans = loans.group_by(lk)
    if start:
        loans = loans.where(Transaction.transaction_date >= start)
    if end:
        loans = loans.where(Transaction.transaction_date <= end)
    for r in db.execute(loans):
        f = out.setdefault(r.k, Flow())
        f.lent, f.borrowed, f.loan_count = q(r.lent), q(r.borrowed), r.n

    # --- repayments
    rk = _key(Repayment.repayment_date, bucket).label("k")
    reps = (
        select(
            rk,
            func.coalesce(func.sum(case((Transaction.transaction_type == LENT, Repayment.amount), else_=0)), 0).label("received"),
            func.coalesce(func.sum(case((Transaction.transaction_type == BORROWED, Repayment.amount), else_=0)), 0).label("returned"),
            func.count(Repayment.id).label("n"),
        )
        .join(Transaction, Transaction.id == Repayment.transaction_id)
        .where(
            Repayment.user_id == user_id,
            Repayment.deleted_at.is_(None),
            Transaction.deleted_at.is_(None),
        )
    )
    if bucket:
        reps = reps.group_by(rk)
    if start:
        reps = reps.where(Repayment.repayment_date >= start)
    if end:
        reps = reps.where(Repayment.repayment_date <= end)
    for r in db.execute(reps):
        f = out.setdefault(r.k, Flow())
        f.received, f.returned, f.repayment_count = q(r.received), q(r.returned), r.n

    return out
