import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.utils.money import fmt

TXN_FIELDS = (
    "person_id",
    "transaction_type",
    "amount",
    "transaction_date",
    "expected_date",
    "description",
    "notes",
)
REPAYMENT_FIELDS = (
    "transaction_id",
    "amount",
    "repayment_date",
    "payment_method",
    "description",
    "notes",
)
PERSON_FIELDS = ("name", "phone", "email", "address", "notes", "archived_at")


def _jsonable(v: Any) -> Any:
    if isinstance(v, Decimal):
        return fmt(v)  # always 2dp so "1500" and "1500.00" compare equal
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    return v


def snapshot(obj: Any, fields: tuple[str, ...]) -> dict[str, Any]:
    return {f: _jsonable(getattr(obj, f)) for f in fields}


def record(
    db: Session,
    user_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    action: str,
    before: dict | None = None,
    after: dict | None = None,
) -> None:
    """Adds an audit row to the current DB transaction so it commits or rolls back with the change."""
    db.add(
        AuditLog(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            before=before,
            after=after,
        )
    )
