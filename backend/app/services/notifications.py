import uuid
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.reporting import NotificationCounts, NotificationItem, Notifications
from app.services.entries import entries_subquery
from app.utils.dates import today_local
from app.utils.money import ZERO, q


def get_notifications(db: Session, user_id: uuid.UUID, window_days: int = 7) -> Notifications:
    """Reminders derived purely from recorded loans with an expected date and an unpaid balance.
    Nothing here is sent to anyone; it only drives in-app indicators."""
    today = today_local()
    horizon = today + timedelta(days=window_days)
    u = entries_subquery(user_id)
    rows = db.execute(
        select(u)
        .where(
            u.c.entry_type.in_(["LENT", "BORROWED"]),
            u.c.outstanding > 0,
            u.c.expected_date.is_not(None),
            u.c.expected_date <= horizon,
        )
        .order_by(u.c.expected_date.asc(), u.c.created_at.asc())
    ).all()

    items: list[NotificationItem] = []
    n = {"OR": 0, "OP": 0, "UR": 0, "UP": 0}
    amt: dict[str, Decimal] = {k: ZERO for k in n}
    for r in rows:
        overdue = r.expected_date < today
        receivable = r.entry_type == "LENT"
        key = ("O" if overdue else "U") + ("R" if receivable else "P")
        n[key] += 1
        amt[key] += q(r.outstanding)
        items.append(
            NotificationItem(
                transaction_id=r.transaction_id,
                person_id=r.person_id,
                person_name=r.person_name,
                direction="RECEIVABLE" if receivable else "PAYABLE",
                kind="OVERDUE" if overdue else "UPCOMING",
                outstanding=q(r.outstanding),
                expected_date=r.expected_date,
                days=abs((today - r.expected_date).days),
                description=r.description,
            )
        )
    counts = NotificationCounts(
        overdue_receivable=n["OR"],
        overdue_payable=n["OP"],
        upcoming_receivable=n["UR"],
        upcoming_payable=n["UP"],
        total=sum(n.values()),
        overdue_receivable_amount=amt["OR"],
        overdue_payable_amount=amt["OP"],
        upcoming_receivable_amount=amt["UR"],
        upcoming_payable_amount=amt["UP"],
    )
    return Notifications(counts=counts, items=items)
