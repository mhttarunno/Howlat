import math
from decimal import Decimal
from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

from app.utils.money import fmt

# Money is exchanged as a decimal STRING in JSON ("5000.00") and never as a float.
MoneyOut = Annotated[Decimal, PlainSerializer(fmt, return_type=str, when_used="json")]
MoneyIn = Annotated[Decimal, Field(gt=0, max_digits=14, decimal_places=2)]

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(cls, items: list[T], total: int, page: int, page_size: int) -> "Page[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=max(1, math.ceil(total / page_size)) if page_size else 1,
        )


def clean_optional_text(v):
    """Form inputs send '' for empty optional fields; store them as NULL."""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v
