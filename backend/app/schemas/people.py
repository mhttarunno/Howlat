import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import MoneyOut, ORMModel, clean_optional_text


class _PersonFields(BaseModel):
    @field_validator("phone", "address", "notes", "email", mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, v):
        return clean_optional_text(v)


class PersonCreate(_PersonFields):
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v


class PersonUpdate(_PersonFields):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=300)
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be blank")
        return v


class PersonBalances(BaseModel):
    """All figures are computed on the backend from transactions and repayments."""

    total_lent: MoneyOut  # money given to this person
    total_borrowed: MoneyOut  # money received from this person
    repaid_to_me: MoneyOut  # they paid back what I lent
    repaid_by_me: MoneyOut  # I paid back what I borrowed
    receivable: MoneyOut  # they still owe me
    payable: MoneyOut  # I still owe them
    net_balance: MoneyOut  # receivable - payable (positive: they owe me overall)


class PersonOut(ORMModel):
    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    balances: PersonBalances
    transaction_count: int = 0
