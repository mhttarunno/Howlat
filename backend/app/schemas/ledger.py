import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.common import MoneyIn, MoneyOut, clean_optional_text

TransactionType = Literal["LENT", "BORROWED"]
EntryType = Literal["LENT", "BORROWED", "REPAYMENT_RECEIVED", "REPAYMENT_RETURNED"]
Status = Literal["UNPAID", "PARTIALLY_PAID", "FULLY_PAID"]


class _Text(BaseModel):
    @field_validator("description", "notes", "payment_method", mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, v):
        return clean_optional_text(v)


# ---------- Transactions (the original loans) ----------


class TransactionCreate(_Text):
    person_id: uuid.UUID
    transaction_type: TransactionType
    amount: MoneyIn
    transaction_date: date
    expected_date: date | None = None
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=5000)

    @model_validator(mode="after")
    def _dates(self):
        if self.expected_date and self.expected_date < self.transaction_date:
            raise ValueError("Expected date cannot be before the transaction date")
        return self


class TransactionUpdate(_Text):
    """Balances, status and totals are never accepted from clients; only the original facts."""

    person_id: uuid.UUID | None = None
    amount: MoneyIn | None = None
    transaction_date: date | None = None
    expected_date: date | None = None
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=5000)


class RepaymentBrief(BaseModel):
    id: uuid.UUID
    amount: MoneyOut
    repayment_date: date
    payment_method: str | None
    description: str | None
    notes: str | None
    created_at: datetime


class TransactionOut(BaseModel):
    id: uuid.UUID
    ref: str
    person_id: uuid.UUID
    person_name: str
    transaction_type: TransactionType
    amount: MoneyOut
    paid_total: MoneyOut
    outstanding: MoneyOut
    status: Status
    transaction_date: date
    expected_date: date | None
    is_overdue: bool
    description: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    repayments: list[RepaymentBrief] = []


# ---------- Repayments ----------


class RepaymentCreate(_Text):
    transaction_id: uuid.UUID
    # Optional: if given it must match the transaction's person (guards against UI mix-ups).
    person_id: uuid.UUID | None = None
    amount: MoneyIn
    repayment_date: date
    payment_method: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=5000)


class RepaymentUpdate(_Text):
    amount: MoneyIn | None = None
    repayment_date: date | None = None
    payment_method: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=5000)


class RepaymentOut(BaseModel):
    id: uuid.UUID
    ref: str
    transaction_id: uuid.UUID
    transaction_ref: str
    person_id: uuid.UUID
    person_name: str
    direction: Literal["RECEIVED", "RETURNED"]
    amount: MoneyOut
    repayment_date: date
    payment_method: str | None
    description: str | None
    notes: str | None
    transaction_amount: MoneyOut
    transaction_outstanding: MoneyOut
    transaction_status: Status
    created_at: datetime
    updated_at: datetime


# ---------- Unified ledger rows ----------


class LedgerEntry(BaseModel):
    """One row of the unified transaction table: a loan or a single repayment."""

    id: uuid.UUID
    ref: str
    entry_type: EntryType
    transaction_id: uuid.UUID  # the loan itself (== id for LENT/BORROWED rows)
    person_id: uuid.UUID
    person_name: str
    amount: MoneyOut
    entry_date: date
    expected_date: date | None
    description: str | None
    notes: str | None
    payment_method: str | None
    loan_amount: MoneyOut
    paid_total: MoneyOut
    outstanding: MoneyOut
    status: Status  # status of the underlying loan
    is_overdue: bool
    created_at: datetime
