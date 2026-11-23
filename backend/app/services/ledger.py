"""Loans (transactions) and repayments: create / edit / delete with full validation.

Concurrency model: every write that depends on a loan's remaining balance first takes a
row lock on that loan (SELECT ... FOR UPDATE) and only then re-reads the repayment total.
Two simultaneous repayments for the same loan therefore run one after the other, and the
second sees the first's committed amount, so the sum can never exceed the loan.
"""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationFailed
from app.models import Person, Repayment, Transaction
from app.schemas.ledger import (
    RepaymentBrief,
    RepaymentCreate,
    RepaymentOut,
    RepaymentUpdate,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.services import audit
from app.services.balances import paid_total, status_for
from app.utils.dates import today_local
from app.utils.money import fmt, q


def ref_of(id_: uuid.UUID) -> str:
    return str(id_)[:8].upper()


# ---------------------------------------------------------------- lookups


def get_person(db: Session, user_id: uuid.UUID, person_id: uuid.UUID, *, require_active: bool = False) -> Person:
    person = db.execute(
        select(Person).where(Person.id == person_id, Person.user_id == user_id)
    ).scalar_one_or_none()
    if person is None:
        raise NotFoundError("Person not found")
    if require_active and person.archived_at is not None:
        raise ConflictError("This person is archived. Restore them before adding new records.")
    return person


def _load_transaction(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID, *, lock: bool = False) -> Transaction:
    stmt = select(Transaction).where(
        Transaction.id == transaction_id,
        Transaction.user_id == user_id,
        Transaction.deleted_at.is_(None),
    )
    if lock:
        stmt = stmt.with_for_update(of=Transaction)
    txn = db.execute(stmt).unique().scalar_one_or_none()
    if txn is None:
        raise NotFoundError("Transaction not found")
    return txn


def _load_repayment(db: Session, user_id: uuid.UUID, repayment_id: uuid.UUID) -> Repayment:
    rep = db.execute(
        select(Repayment).where(
            Repayment.id == repayment_id,
            Repayment.user_id == user_id,
            Repayment.deleted_at.is_(None),
        )
    ).unique().scalar_one_or_none()
    if rep is None:
        raise NotFoundError("Repayment not found")
    return rep


# ---------------------------------------------------------------- views


def build_transaction_out(db: Session, user_id: uuid.UUID, txn: Transaction, *, with_repayments: bool = True) -> TransactionOut:
    paid = paid_total(db, user_id, txn.id)
    outstanding = q(txn.amount - paid)
    reps: list[RepaymentBrief] = []
    if with_repayments:
        rows = db.execute(
            select(Repayment)
            .where(Repayment.transaction_id == txn.id, Repayment.deleted_at.is_(None))
            .order_by(Repayment.repayment_date, Repayment.created_at)
        ).unique().scalars()
        reps = [
            RepaymentBrief(
                id=r.id, amount=r.amount, repayment_date=r.repayment_date,
                payment_method=r.payment_method, description=r.description,
                notes=r.notes, created_at=r.created_at,
            )
            for r in rows
        ]
    return TransactionOut(
        id=txn.id,
        ref=ref_of(txn.id),
        person_id=txn.person_id,
        person_name=txn.person.name,
        transaction_type=txn.transaction_type,
        amount=txn.amount,
        paid_total=paid,
        outstanding=outstanding,
        status=status_for(txn.amount, paid),
        transaction_date=txn.transaction_date,
        expected_date=txn.expected_date,
        is_overdue=bool(outstanding > 0 and txn.expected_date and txn.expected_date < today_local()),
        description=txn.description,
        notes=txn.notes,
        created_at=txn.created_at,
        updated_at=txn.updated_at,
        repayments=reps,
    )


def build_repayment_out(db: Session, user_id: uuid.UUID, rep: Repayment) -> RepaymentOut:
    txn = rep.transaction
    paid = paid_total(db, user_id, txn.id)
    return RepaymentOut(
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
        transaction_outstanding=q(txn.amount - paid),
        transaction_status=status_for(txn.amount, paid),
        created_at=rep.created_at,
        updated_at=rep.updated_at,
    )


# ---------------------------------------------------------------- transactions


def get_transaction(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID) -> TransactionOut:
    return build_transaction_out(db, user_id, _load_transaction(db, user_id, transaction_id))


def create_transaction(
    db: Session, user_id: uuid.UUID, data: TransactionCreate, idempotency_key: str | None = None
) -> TransactionOut:
    if idempotency_key:
        existing = db.execute(
            select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.idempotency_key == idempotency_key,
                Transaction.deleted_at.is_(None),
            )
        ).unique().scalar_one_or_none()
        if existing:
            return build_transaction_out(db, user_id, existing)

    get_person(db, user_id, data.person_id, require_active=True)
    txn = Transaction(
        user_id=user_id,
        person_id=data.person_id,
        transaction_type=data.transaction_type,
        amount=data.amount,
        transaction_date=data.transaction_date,
        expected_date=data.expected_date,
        description=data.description,
        notes=data.notes,
        idempotency_key=idempotency_key,
    )
    db.add(txn)
    try:
        db.flush()
    except IntegrityError:
        # Lost a race on the idempotency key: the other request already created it.
        db.rollback()
        if not idempotency_key:
            raise
        existing = db.execute(
            select(Transaction).where(
                Transaction.user_id == user_id, Transaction.idempotency_key == idempotency_key
            )
        ).unique().scalar_one()
        return build_transaction_out(db, user_id, existing)
    audit.record(db, user_id, "transaction", txn.id, "CREATE", None, audit.snapshot(txn, audit.TXN_FIELDS))
    db.commit()
    db.refresh(txn)
    return build_transaction_out(db, user_id, txn)


def update_transaction(
    db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID, data: TransactionUpdate
) -> TransactionOut:
    txn = _load_transaction(db, user_id, transaction_id, lock=True)
    before = audit.snapshot(txn, audit.TXN_FIELDS)
    sent = data.model_fields_set

    paid = paid_total(db, user_id, txn.id)

    if "person_id" in sent and data.person_id is not None and data.person_id != txn.person_id:
        get_person(db, user_id, data.person_id, require_active=True)
        txn.person_id = data.person_id
    if "amount" in sent and data.amount is not None:
        if data.amount < paid:
            raise ValidationFailed(
                f"Amount cannot be less than the {fmt(paid)} already repaid. "
                "Edit or remove repayments first."
            )
        txn.amount = data.amount
    if "transaction_date" in sent and data.transaction_date is not None:
        first = db.execute(
            select(func.min(Repayment.repayment_date)).where(
                Repayment.transaction_id == txn.id, Repayment.deleted_at.is_(None)
            )
        ).scalar_one()
        if first and data.transaction_date > first:
            raise ValidationFailed(
                f"Transaction date cannot be after its first repayment ({first.isoformat()})"
            )
        txn.transaction_date = data.transaction_date
    if "expected_date" in sent:
        txn.expected_date = data.expected_date
    if "description" in sent:
        txn.description = data.description
    if "notes" in sent:
        txn.notes = data.notes

    if txn.expected_date and txn.expected_date < txn.transaction_date:
        raise ValidationFailed("Expected date cannot be before the transaction date")

    db.flush()
    after = audit.snapshot(txn, audit.TXN_FIELDS)
    if after != before:
        audit.record(db, user_id, "transaction", txn.id, "UPDATE", before, after)
    db.commit()
    db.refresh(txn)
    return build_transaction_out(db, user_id, txn)


def delete_transaction(db: Session, user_id: uuid.UUID, transaction_id: uuid.UUID) -> None:
    """Soft delete. The loan and its repayments are hidden from every calculation but the audit
    log keeps a full snapshot, so history is never silently lost."""
    txn = _load_transaction(db, user_id, transaction_id, lock=True)
    now = func.now()
    reps = db.execute(
        select(Repayment).where(Repayment.transaction_id == txn.id, Repayment.deleted_at.is_(None))
    ).unique().scalars().all()
    before = audit.snapshot(txn, audit.TXN_FIELDS)
    before["repayments"] = [audit.snapshot(r, audit.REPAYMENT_FIELDS) | {"id": str(r.id)} for r in reps]
    for r in reps:
        r.deleted_at = now
        r.idempotency_key = None
        audit.record(db, user_id, "repayment", r.id, "DELETE", audit.snapshot(r, audit.REPAYMENT_FIELDS), None)
    txn.deleted_at = now
    txn.idempotency_key = None
    audit.record(db, user_id, "transaction", txn.id, "DELETE", before, None)
    db.commit()


# ---------------------------------------------------------------- repayments


def _remaining_check(txn: Transaction, paid_without_this: Decimal, new_amount: Decimal) -> None:
    remaining = q(txn.amount - paid_without_this)
    if remaining <= 0:
        raise ConflictError("This transaction is already fully paid")
    if new_amount > remaining:
        raise ValidationFailed(f"Repayment of {fmt(new_amount)} exceeds the remaining balance of {fmt(remaining)}")


def create_repayment(
    db: Session, user_id: uuid.UUID, data: RepaymentCreate, idempotency_key: str | None = None
) -> RepaymentOut:
    def existing_by_key() -> Repayment | None:
        if not idempotency_key:
            return None
        return db.execute(
            select(Repayment).where(
                Repayment.user_id == user_id,
                Repayment.idempotency_key == idempotency_key,
                Repayment.deleted_at.is_(None),
            )
        ).unique().scalar_one_or_none()

    if (dup := existing_by_key()) is not None:
        return build_repayment_out(db, user_id, dup)

    txn = _load_transaction(db, user_id, data.transaction_id, lock=True)

    # A concurrent duplicate may have committed while we waited for the lock.
    if (dup := existing_by_key()) is not None:
        db.rollback()
        return build_repayment_out(db, user_id, dup)

    if data.person_id is not None and data.person_id != txn.person_id:
        raise ValidationFailed("This repayment does not belong to the selected person")
    if data.repayment_date < txn.transaction_date:
        raise ValidationFailed("Repayment date cannot be before the transaction date")

    paid = paid_total(db, user_id, txn.id)
    _remaining_check(txn, paid, data.amount)

    rep = Repayment(
        user_id=user_id,
        transaction_id=txn.id,
        amount=data.amount,
        repayment_date=data.repayment_date,
        payment_method=data.payment_method,
        description=data.description,
        notes=data.notes,
        idempotency_key=idempotency_key,
    )
    db.add(rep)
    db.flush()
    audit.record(db, user_id, "repayment", rep.id, "CREATE", None, audit.snapshot(rep, audit.REPAYMENT_FIELDS))
    db.commit()
    db.refresh(rep)
    return build_repayment_out(db, user_id, rep)


def get_repayment(db: Session, user_id: uuid.UUID, repayment_id: uuid.UUID) -> RepaymentOut:
    return build_repayment_out(db, user_id, _load_repayment(db, user_id, repayment_id))


def update_repayment(
    db: Session, user_id: uuid.UUID, repayment_id: uuid.UUID, data: RepaymentUpdate
) -> RepaymentOut:
    rep = _load_repayment(db, user_id, repayment_id)
    txn = _load_transaction(db, user_id, rep.transaction_id, lock=True)
    # Re-read under the lock in case it was changed/deleted while we waited.
    db.refresh(rep)
    if rep.deleted_at is not None:
        raise NotFoundError("Repayment not found")

    before = audit.snapshot(rep, audit.REPAYMENT_FIELDS)
    sent = data.model_fields_set

    if "amount" in sent and data.amount is not None:
        paid_others = paid_total(db, user_id, txn.id) - rep.amount
        if data.amount > q(txn.amount - paid_others):
            raise ValidationFailed(
                f"Repayment of {fmt(data.amount)} exceeds the remaining balance of {fmt(txn.amount - paid_others)}"
            )
        rep.amount = data.amount
    if "repayment_date" in sent and data.repayment_date is not None:
        if data.repayment_date < txn.transaction_date:
            raise ValidationFailed("Repayment date cannot be before the transaction date")
        rep.repayment_date = data.repayment_date
    for f in ("payment_method", "description", "notes"):
        if f in sent:
            setattr(rep, f, getattr(data, f))

    db.flush()
    after = audit.snapshot(rep, audit.REPAYMENT_FIELDS)
    if after != before:
        audit.record(db, user_id, "repayment", rep.id, "UPDATE", before, after)
    db.commit()
    db.refresh(rep)
    return build_repayment_out(db, user_id, rep)


def delete_repayment(db: Session, user_id: uuid.UUID, repayment_id: uuid.UUID) -> None:
    rep = _load_repayment(db, user_id, repayment_id)
    _load_transaction(db, user_id, rep.transaction_id, lock=True)
    db.refresh(rep)
    if rep.deleted_at is not None:
        raise NotFoundError("Repayment not found")
    before = audit.snapshot(rep, audit.REPAYMENT_FIELDS)
    rep.deleted_at = func.now()
    rep.idempotency_key = None
    audit.record(db, user_id, "repayment", rep.id, "DELETE", before, None)
    db.commit()
