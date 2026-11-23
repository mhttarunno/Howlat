import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session

from app.schemas.reporting import (
    MonthFlow,
    MonthlyReport,
    PeopleReport,
    PersonBalanceRow,
    ReportSummary,
    YearlyReport,
    YearRow,
)
from app.services import entries
from app.services.balances import overall_balances
from app.services.dashboard import month_series, person_rows
from app.services.flows import Flow, period_flows
from app.utils.dates import add_months, month_start, months_between, today_local
from app.utils.money import ZERO, q

MAX_MONTHS = 120

TYPE_LABEL = {
    "LENT": "Money Lent",
    "BORROWED": "Money Borrowed",
    "REPAYMENT_RECEIVED": "Repayment Received",
    "REPAYMENT_RETURNED": "Repayment Returned",
}
STATUS_LABEL = {"UNPAID": "Unpaid", "PARTIALLY_PAID": "Partially Paid", "FULLY_PAID": "Fully Paid"}


def summary(db: Session, user_id: uuid.UUID, start: date | None, end: date | None) -> ReportSummary:
    f = period_flows(db, user_id, start, end, None).get("total", Flow())
    b = overall_balances(db, user_id)
    return ReportSummary(
        start=start,
        end=end,
        lent=f.lent,
        borrowed=f.borrowed,
        repayments_received=f.received,
        repayments_returned=f.returned,
        loan_count=f.loan_count,
        repayment_count=f.repayment_count,
        outstanding_receivable=b.receivable,
        outstanding_payable=b.payable,
        net_position=b.net,
    )


def monthly(db: Session, user_id: uuid.UUID, start: date | None, end: date | None) -> MonthlyReport:
    end = end or today_local()
    start = start or add_months(month_start(end), -11)
    keys = months_between(start, end)
    if len(keys) > MAX_MONTHS:
        keys = keys[-MAX_MONTHS:]
        start = date(int(keys[0][:4]), int(keys[0][5:]), 1)
    flows = period_flows(db, user_id, start, end, "month")
    rows = month_series(flows, keys)
    totals = MonthFlow(
        month="Total",
        lent=q(sum((r.lent for r in rows), ZERO)),
        borrowed=q(sum((r.borrowed for r in rows), ZERO)),
        received=q(sum((r.received for r in rows), ZERO)),
        returned=q(sum((r.returned for r in rows), ZERO)),
        loan_count=sum(r.loan_count for r in rows),
        repayment_count=sum(r.repayment_count for r in rows),
    )
    return MonthlyReport(start=start, end=end, rows=rows, totals=totals)


def yearly(db: Session, user_id: uuid.UUID) -> YearlyReport:
    flows = period_flows(db, user_id, None, None, "year")
    rows = [
        YearRow(
            year=k, lent=f.lent, borrowed=f.borrowed, received=f.received, returned=f.returned,
            loan_count=f.loan_count, repayment_count=f.repayment_count,
        )
        for k, f in sorted(flows.items(), reverse=True)
    ]
    return YearlyReport(rows=rows)


def people(db: Session, user_id: uuid.UUID) -> PeopleReport:
    rows = sorted(person_rows(db, user_id), key=lambda r: (abs(r.net_balance), r.name.lower()), reverse=True)
    if not rows:
        return PeopleReport(rows=[])
    zero = ZERO
    totals = PersonBalanceRow(
        person_id=uuid.UUID(int=0),
        name="Total",
        archived=False,
        total_lent=q(sum((r.total_lent for r in rows), zero)),
        total_borrowed=q(sum((r.total_borrowed for r in rows), zero)),
        repaid_to_me=q(sum((r.repaid_to_me for r in rows), zero)),
        repaid_by_me=q(sum((r.repaid_by_me for r in rows), zero)),
        receivable=q(sum((r.receivable for r in rows), zero)),
        payable=q(sum((r.payable for r in rows), zero)),
        net_balance=q(sum((r.net_balance for r in rows), zero)),
    )
    return PeopleReport(rows=rows, totals=totals)


# ------------------------------------------------------------------ export datasets


@dataclass
class Dataset:
    title: str
    subtitle: str
    columns: list[str]
    rows: list[list[object]]  # str | Decimal | int | date
    numeric: set[int] = field(default_factory=set)  # indexes of money columns


ReportName = Literal["transactions", "monthly", "yearly", "people", "outstanding", "summary"]


def _period_text(start: date | None, end: date | None) -> str:
    if not start and not end:
        return "All time"
    return f"{start.isoformat() if start else '…'} to {end.isoformat() if end else '…'}"


def build_dataset(
    db: Session, user_id: uuid.UUID, report: ReportName, start: date | None, end: date | None, currency: str
) -> Dataset:
    cur = f"({currency})"
    period = _period_text(start, end)

    if report == "transactions":
        items = entries.all_entries(db, user_id, entries.EntryFilters(date_from=start, date_to=end))
        return Dataset(
            "Transactions", f"Period: {period}",
            ["Ref", "Date", "Person", "Type", f"Amount {cur}", f"Loan Amount {cur}", f"Total Repaid {cur}",
             f"Outstanding {cur}", "Status", "Expected Date", "Description"],
            [[e.ref, e.entry_date, e.person_name, TYPE_LABEL[e.entry_type], e.amount, e.loan_amount, e.paid_total,
              e.outstanding, STATUS_LABEL[e.status], e.expected_date or "", e.description or ""] for e in items],
            {4, 5, 6, 7},
        )

    if report == "outstanding":
        items = entries.all_entries(db, user_id, entries.EntryFilters(open_only=True))
        items.sort(key=lambda e: (e.entry_type, e.expected_date or date.max))
        return Dataset(
            "Outstanding Balances", "As of today",
            ["Ref", "Direction", "Person", "Loan Date", "Expected Date", f"Original {cur}", f"Repaid {cur}",
             f"Outstanding {cur}", "Status", "Overdue", "Description"],
            [[e.ref, "They owe me" if e.entry_type == "LENT" else "I owe them", e.person_name, e.entry_date,
              e.expected_date or "", e.loan_amount, e.paid_total, e.outstanding, STATUS_LABEL[e.status],
              "Yes" if e.is_overdue else "", e.description or ""] for e in items],
            {5, 6, 7},
        )

    if report == "monthly":
        m = monthly(db, user_id, start, end)
        rows = [[r.month, r.lent, r.borrowed, r.received, r.returned, r.loan_count, r.repayment_count] for r in m.rows]
        t = m.totals
        rows.append(["Total", t.lent, t.borrowed, t.received, t.returned, t.loan_count, t.repayment_count])
        return Dataset(
            "Monthly Summary", f"Period: {m.start.isoformat()} to {m.end.isoformat()}",
            ["Month", f"Lent {cur}", f"Borrowed {cur}", f"Repayments Received {cur}", f"Repayments Returned {cur}",
             "Loans", "Repayments"],
            rows, {1, 2, 3, 4},
        )

    if report == "yearly":
        y = yearly(db, user_id)
        return Dataset(
            "Yearly Summary", "All years",
            ["Year", f"Lent {cur}", f"Borrowed {cur}", f"Repayments Received {cur}", f"Repayments Returned {cur}",
             "Loans", "Repayments"],
            [[r.year, r.lent, r.borrowed, r.received, r.returned, r.loan_count, r.repayment_count] for r in y.rows],
            {1, 2, 3, 4},
        )

    if report == "people":
        p = people(db, user_id)
        allrows = p.rows + ([p.totals] if p.totals else [])
        return Dataset(
            "Person-wise Balances", "As of today",
            ["Person", f"Total Lent {cur}", f"Total Borrowed {cur}", f"Repaid To Me {cur}", f"Repaid By Me {cur}",
             f"They Owe Me {cur}", f"I Owe Them {cur}", f"Net {cur}"],
            [[r.name + (" (archived)" if r.archived else ""), r.total_lent, r.total_borrowed, r.repaid_to_me,
              r.repaid_by_me, r.receivable, r.payable, r.net_balance] for r in allrows],
            {1, 2, 3, 4, 5, 6, 7},
        )

    # summary
    s = summary(db, user_id, start, end)
    return Dataset(
        "Summary", f"Period: {period}",
        ["Metric", f"Amount {cur}"],
        [
            ["Money lent in period", s.lent],
            ["Money borrowed in period", s.borrowed],
            ["Repayments received in period", s.repayments_received],
            ["Repayments returned in period", s.repayments_returned],
            ["Outstanding receivable (current)", s.outstanding_receivable],
            ["Outstanding payable (current)", s.outstanding_payable],
            ["Net position (current)", s.net_position],
        ],
        {1},
    )
