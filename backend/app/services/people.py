import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import Person, Transaction
from app.schemas.common import Page
from app.schemas.people import PersonBalances, PersonCreate, PersonOut, PersonUpdate
from app.services import audit
from app.services.balances import Balances, balances_by_person, person_balances
from app.services.ledger import get_person
from app.utils.sql import escape_like

_EMPTY = Balances()


def _out(p: Person, balances: Balances, count: int) -> PersonOut:
    return PersonOut(
        id=p.id,
        name=p.name,
        phone=p.phone,
        email=p.email,
        address=p.address,
        notes=p.notes,
        created_at=p.created_at,
        updated_at=p.updated_at,
        archived_at=p.archived_at,
        balances=PersonBalances(**balances.as_dict()),
        transaction_count=count,
    )


def create_person(db: Session, user_id: uuid.UUID, data: PersonCreate) -> PersonOut:
    p = Person(user_id=user_id, **data.model_dump())
    db.add(p)
    db.flush()
    audit.record(db, user_id, "person", p.id, "CREATE", None, audit.snapshot(p, audit.PERSON_FIELDS))
    db.commit()
    db.refresh(p)
    return _out(p, _EMPTY, 0)


def get_person_out(db: Session, user_id: uuid.UUID, person_id: uuid.UUID) -> PersonOut:
    p = get_person(db, user_id, person_id)
    n = db.execute(
        select(func.count()).select_from(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.person_id == p.id,
            Transaction.deleted_at.is_(None),
        )
    ).scalar_one()
    return _out(p, person_balances(db, user_id, p.id), n)


def list_people(
    db: Session,
    user_id: uuid.UUID,
    *,
    search: str | None = None,
    status: str = "active",  # active | archived | all
    balance: str | None = None,  # owes_me | i_owe | settled
    sort: str = "name",  # name | receivable | payable | created
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Page[PersonOut]:
    stmt = select(Person).where(Person.user_id == user_id)
    if status == "active":
        stmt = stmt.where(Person.archived_at.is_(None))
    elif status == "archived":
        stmt = stmt.where(Person.archived_at.is_not(None))
    if search:
        stmt = stmt.where(Person.name.ilike(f"%{escape_like(search.strip())}%", escape="\\"))

    people = db.execute(stmt).scalars().all()
    agg = balances_by_person(db, user_id)

    rows = [(p, *agg.get(p.id, (_EMPTY, 0))) for p in people]
    if balance == "owes_me":
        rows = [r for r in rows if r[1].receivable > 0]
    elif balance == "i_owe":
        rows = [r for r in rows if r[1].payable > 0]
    elif balance == "settled":
        rows = [r for r in rows if r[1].receivable == 0 and r[1].payable == 0]

    keyfns = {
        "name": lambda r: r[0].name.lower(),
        "receivable": lambda r: r[1].receivable,
        "payable": lambda r: r[1].payable,
        "net": lambda r: r[1].net,
        "created": lambda r: r[0].created_at,
    }
    rows.sort(key=keyfns.get(sort, keyfns["name"]), reverse=(order == "desc"))

    total = len(rows)
    window = rows[(page - 1) * page_size : page * page_size]
    return Page.build([_out(p, b, n) for p, b, n in window], total, page, page_size)


def update_person(db: Session, user_id: uuid.UUID, person_id: uuid.UUID, data: PersonUpdate) -> PersonOut:
    p = get_person(db, user_id, person_id)
    before = audit.snapshot(p, audit.PERSON_FIELDS)
    for f in data.model_fields_set:
        value = getattr(data, f)
        if f == "name" and value is None:
            continue
        setattr(p, f, value)
    db.flush()
    after = audit.snapshot(p, audit.PERSON_FIELDS)
    if after != before:
        audit.record(db, user_id, "person", p.id, "UPDATE", before, after)
    db.commit()
    db.refresh(p)
    return get_person_out(db, user_id, p.id)


def archive_person(db: Session, user_id: uuid.UUID, person_id: uuid.UUID) -> PersonOut:
    """People are archived, never hard-deleted: their loans and repayments stay in your history."""
    p = get_person(db, user_id, person_id)
    if p.archived_at is None:
        before = audit.snapshot(p, audit.PERSON_FIELDS)
        p.archived_at = datetime.now(timezone.utc)
        db.flush()
        audit.record(db, user_id, "person", p.id, "ARCHIVE", before, audit.snapshot(p, audit.PERSON_FIELDS))
        db.commit()
    return get_person_out(db, user_id, p.id)


def restore_person(db: Session, user_id: uuid.UUID, person_id: uuid.UUID) -> PersonOut:
    p = get_person(db, user_id, person_id)
    if p.archived_at is None:
        raise ConflictError("Person is not archived")
    before = audit.snapshot(p, audit.PERSON_FIELDS)
    p.archived_at = None
    db.flush()
    audit.record(db, user_id, "person", p.id, "RESTORE", before, audit.snapshot(p, audit.PERSON_FIELDS))
    db.commit()
    return get_person_out(db, user_id, p.id)
