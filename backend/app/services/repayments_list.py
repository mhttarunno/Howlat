import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Repayment, Transaction
from app.schemas.common import Page
from app.schemas.ledger import RepaymentOut
from app.services.balances import paid_subquery, status_for
from app.services.ledger import ref_of
from app.utils.money import q


def list_repayments(
    db: Session,
    user_id: uuid.UUID,
    *,
    transaction_id: uuid.UUID | None,
    person_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
    page: int,
    page_size: int,
) -> Page[RepaymentOut]:
    paid = paid_subquery(user_id)
    base = (
        select(Repayment, Transaction, func.coalesce(paid.c.paid, 0).label("paid"))
        .join(Transaction, Transaction.id == Repayment.transaction_id)
        .outerjoin(paid, paid.c.tid == Transaction.id)
        .where(
            Repayment.user_id == user_id,
            Repayment.deleted_at.is_(None),
            Transaction.deleted_at.is_(None),
        )
    )
    if transaction_id:
        base = base.where(Repayment.transaction_id == transaction_id)
    if person_id:
        base = base.where(Transaction.person_id == person_id)
    if date_from:
        base = base.where(Repayment.repayment_date >= date_from)
    if date_to:
        base = base.where(Repayment.repayment_date <= date_to)

    total = db.execute(select(func.count()).select_from(base.order_by(None).subquery())).scalar_one()
    rows = db.execute(
        base.order_by(Repayment.repayment_date.desc(), Repayment.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    ).unique()

    items = []
    for rep, txn, paid_amt in rows:
        paid_q = q(paid_amt)
        items.append(
            RepaymentOut(
                id=rep.id,
                ref=ref_of(rep.id),
                transaction_id=txn.id,
                transaction_ref=ref_of(txn.id),
                person_id=txn.person_id,
                person_name=txn.person.name,
                direction="RECEIVED" if txn.transaction_type == "LENT" else "RETURNED",
                amount=rep.amount,
                repayment_date=rep.repayment_date,
                payment_method=rep.payment_method,
                description=rep.description,
                notes=rep.notes,
                transaction_amount=txn.amount,
                transaction_outstanding=q(txn.amount - paid_q),
                transaction_status=status_for(txn.amount, paid_q),
                created_at=rep.created_at,
                updated_at=rep.updated_at,
            )
        )
    return Page.build(items, total, page, page_size)
