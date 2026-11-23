import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Person
from app.schemas.reporting import DashboardCharts, DashboardSummary, MonthFlow, PersonBalanceRow
from app.services.balances import Balances, balances_by_person, overall_balances
from app.services.entries import entries_subquery
from app.services.flows import Flow, period_flows
from app.services.notifications import get_notifications
from app.utils.dates import add_months, month_start, months_between, today_local


def person_rows(db: Session, user_id: uuid.UUID) -> list[PersonBalanceRow]:
    agg = balances_by_person(db, user_id)
    if not agg:
        return []
    people = db.execute(select(Person).where(Person.user_id == user_id, Person.id.in_(agg.keys()))).scalars()
    rows = []
    for p in people:
        b: Balances = agg[p.id][0]
        rows.append(PersonBalanceRow(person_id=p.id, name=p.name, archived=p.archived_at is not None, **b.as_dict()))
    return rows


def get_summary(db: Session, user_id: uuid.UUID, top_n: int = 5) -> DashboardSummary:
    b = overall_balances(db, user_id)
    rows = person_rows(db, user_id)
    top_rec = sorted((r for r in rows if r.receivable > 0), key=lambda r: r.receivable, reverse=True)[:top_n]
    top_pay = sorted((r for r in rows if r.payable > 0), key=lambda r: r.payable, reverse=True)[:top_n]

    u = entries_subquery(user_id)
    open_counts = dict(
        db.execute(
            select(u.c.entry_type, func.count())
            .where(u.c.entry_type.in_(["LENT", "BORROWED"]), u.c.outstanding > 0)
            .group_by(u.c.entry_type)
        ).all()
    )
    notes = get_notifications(db, user_id).counts

    net = b.net
    return DashboardSummary(
        total_lent=b.total_lent,
        total_borrowed=b.total_borrowed,
        total_received_back=b.repaid_to_me,
        total_returned=b.repaid_by_me,
        outstanding_receivable=b.receivable,
        outstanding_payable=b.payable,
        net_position=net,
        position="NET_RECEIVABLE" if net > 0 else "NET_PAYABLE" if net < 0 else "SETTLED",
        open_receivables=open_counts.get("LENT", 0),
        open_payables=open_counts.get("BORROWED", 0),
        overdue_receivables=notes.overdue_receivable,
        overdue_payables=notes.overdue_payable,
        top_receivables=top_rec,
        top_payables=top_pay,
    )


def month_series(flows: dict[str, Flow], keys: list[str]) -> list[MonthFlow]:
    out = []
    for k in keys:
        f = flows.get(k, Flow())
        out.append(
            MonthFlow(
                month=k, lent=f.lent, borrowed=f.borrowed, received=f.received, returned=f.returned,
                loan_count=f.loan_count, repayment_count=f.repayment_count,
            )
        )
    return out


def get_charts(db: Session, user_id: uuid.UUID, months: int = 12) -> DashboardCharts:
    today = today_local()
    first = add_months(month_start(today), -(months - 1))
    end_of_this_month = add_months(month_start(today), 1) - timedelta(days=1)
    flows = period_flows(db, user_id, first, end_of_this_month, "month")
    keys = months_between(first, today)
    b = overall_balances(db, user_id)
    return DashboardCharts(months=month_series(flows, keys), receivable=b.receivable, payable=b.payable)
