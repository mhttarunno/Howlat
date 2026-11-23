import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import MoneyOut


class PersonBalanceRow(BaseModel):
    person_id: uuid.UUID
    name: str
    archived: bool
    total_lent: MoneyOut
    total_borrowed: MoneyOut
    repaid_to_me: MoneyOut
    repaid_by_me: MoneyOut
    receivable: MoneyOut
    payable: MoneyOut
    net_balance: MoneyOut


class DashboardSummary(BaseModel):
    total_lent: MoneyOut
    total_borrowed: MoneyOut
    total_received_back: MoneyOut
    total_returned: MoneyOut
    outstanding_receivable: MoneyOut
    outstanding_payable: MoneyOut
    net_position: MoneyOut
    position: Literal["NET_RECEIVABLE", "NET_PAYABLE", "SETTLED"]
    open_receivables: int
    open_payables: int
    overdue_receivables: int
    overdue_payables: int
    top_receivables: list[PersonBalanceRow]
    top_payables: list[PersonBalanceRow]


class MonthFlow(BaseModel):
    month: str  # YYYY-MM
    lent: MoneyOut
    borrowed: MoneyOut
    received: MoneyOut
    returned: MoneyOut
    loan_count: int
    repayment_count: int


class DashboardCharts(BaseModel):
    months: list[MonthFlow]
    receivable: MoneyOut
    payable: MoneyOut


class ReportSummary(BaseModel):
    start: date | None
    end: date | None
    lent: MoneyOut
    borrowed: MoneyOut
    repayments_received: MoneyOut
    repayments_returned: MoneyOut
    loan_count: int
    repayment_count: int
    # Current position (as of now, independent of the period filter)
    outstanding_receivable: MoneyOut
    outstanding_payable: MoneyOut
    net_position: MoneyOut


class MonthlyReport(BaseModel):
    start: date | None
    end: date | None
    rows: list[MonthFlow]
    totals: MonthFlow


class YearRow(BaseModel):
    year: str
    lent: MoneyOut
    borrowed: MoneyOut
    received: MoneyOut
    returned: MoneyOut
    loan_count: int
    repayment_count: int


class YearlyReport(BaseModel):
    rows: list[YearRow]


class PeopleReport(BaseModel):
    rows: list[PersonBalanceRow]
    totals: PersonBalanceRow | None = None


class NotificationItem(BaseModel):
    transaction_id: uuid.UUID
    person_id: uuid.UUID
    person_name: str
    direction: Literal["RECEIVABLE", "PAYABLE"]
    kind: Literal["OVERDUE", "UPCOMING"]
    outstanding: MoneyOut
    expected_date: date
    days: int  # days overdue (kind=OVERDUE) or days until due (kind=UPCOMING; 0 = today)
    description: str | None


class NotificationCounts(BaseModel):
    overdue_receivable: int
    overdue_payable: int
    upcoming_receivable: int
    upcoming_payable: int
    total: int
    overdue_receivable_amount: MoneyOut
    overdue_payable_amount: MoneyOut
    upcoming_receivable_amount: MoneyOut
    upcoming_payable_amount: MoneyOut


class Notifications(BaseModel):
    counts: NotificationCounts
    items: list[NotificationItem]
