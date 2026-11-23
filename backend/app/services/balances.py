"""Canonical balance calculations. Every total shown anywhere (dashboard, people, reports,
exports) is derived from here, from the raw transactions + repayments rows.

    outstanding(loan)      = loan.amount - sum(active repayments of that loan)
    receivable (overall)   = sum(outstanding) over LENT loans
    payable    (overall)   = sum(outstanding) over BORROWED loans
    net position           = receivable - payable
"""

import uuid
from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import Select, case, func, select
from sqlalchemy.orm import Session

from app.models import BORROWED, LENT, Repayment, Transaction
from app.utils.money import ZERO, q


def status_for(amount: Decimal, paid: Decimal) -> str:
    remaining = amount - paid
    if remaining <= 0:
        return "FULLY_PAID"
    if paid <= 0:
        return "UNPAID"
    return "PARTIALLY_PAID"


def paid_subquery(user_id: uuid.UUID):
    """Total of active repayments per loan."""
    return (
        select(
            Repayment.transaction_id.label("tid"),
            func.coalesce(func.sum(Repayment.amount), 0).label("paid"),
        )
        .where(Repayment.user_id == user_id, Repayment.deleted_at.is_(None))
        .group_by(Repayment.transaction_id)
        .subquery("paid_per_loan")
    )


def paid_total(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID) -> Decimal:
    value = db.execute(
        select(func.coalesce(func.sum(Repayment.amount), 0)).where(
            Repayment.user_id == user_id,
            Repayment.transaction_id == transaction_id,
            Repayment.deleted_at.is_(None),
        )
    ).scalar_one()
    return q(value)


@dataclass(frozen=True)
class Balances:
    total_lent: Decimal = ZERO
    total_borrowed: Decimal = ZERO
    repaid_to_me: Decimal = ZERO  # repayments received on LENT loans
    repaid_by_me: Decimal = ZERO  # repayments returned on BORROWED loans

    @property
    def receivable(self) -> Decimal:
        return q(self.total_lent - self.repaid_to_me)

    @property
    def payable(self) -> Decimal:
        return q(self.total_borrowed - self.repaid_by_me)

    @property
    def net(self) -> Decimal:
        return q(self.receivable - self.payable)

    def as_dict(self) -> dict[str, Decimal]:
        return {
            "total_lent": q(self.total_lent),
            "total_borrowed": q(self.total_borrowed),
            "repaid_to_me": q(self.repaid_to_me),
            "repaid_by_me": q(self.repaid_by_me),
            "receivable": self.receivable,
            "payable": self.payable,
            "net_balance": self.net,
        }


def _agg_columns(paid):
    paid_amt = func.coalesce(paid.c.paid, 0)
    return (
        func.coalesce(func.sum(case((Transaction.transaction_type == LENT, Transaction.amount), else_=0)), 0).label("total_lent"),
        func.coalesce(func.sum(case((Transaction.transaction_type == BORROWED, Transaction.amount), else_=0)), 0).label("total_borrowed"),
        func.coalesce(func.sum(case((Transaction.transaction_type == LENT, paid_amt), else_=0)), 0).label("repaid_to_me"),
        func.coalesce(func.sum(case((Transaction.transaction_type == BORROWED, paid_amt), else_=0)), 0).label("repaid_by_me"),
    )


def _row_to_balances(row) -> Balances:
    return Balances(
        total_lent=q(row.total_lent),
        total_borrowed=q(row.total_borrowed),
        repaid_to_me=q(row.repaid_to_me),
        repaid_by_me=q(row.repaid_by_me),
    )


def _base(user_id: uuid.UUID, *cols) -> Select:
    paid = paid_subquery(user_id)
    return (
        select(*cols, *_agg_columns(paid))
        .select_from(Transaction)
        .outerjoin(paid, paid.c.tid == Transaction.id)
        .where(Transaction.user_id == user_id, Transaction.deleted_at.is_(None))
    )


def overall_balances(db: Session, user_id: uuid.UUID) -> Balances:
    row = db.execute(_base(user_id)).one()
    return _row_to_balances(row)


def person_balances(db: Session, user_id: uuid.UUID, person_id: uuid.UUID) -> Balances:
    row = db.execute(_base(user_id).where(Transaction.person_id == person_id)).one()
    return _row_to_balances(row)


def balances_by_person(db: Session, user_id: uuid.UUID) -> dict[uuid.UUID, tuple[Balances, int]]:
    """One grouped query for every person (no N+1). Returns {person_id: (balances, loan_count)}."""
    stmt = _base(user_id, Transaction.person_id, func.count(Transaction.id).label("n")).group_by(
        Transaction.person_id
    )
    return {r.person_id: (_row_to_balances(r), r.n) for r in db.execute(stmt)}
