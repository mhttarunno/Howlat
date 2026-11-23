from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0.00")
TWO_PLACES = Decimal("0.01")


def q(value: Decimal | int | str | None) -> Decimal:
    """Quantize to 2 decimal places. None -> 0.00. Never touches float."""
    if value is None:
        return ZERO
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def fmt(value: Decimal) -> str:
    return format(q(value), "f")
