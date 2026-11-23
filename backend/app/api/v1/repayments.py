import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import DB, CurrentUser, IdempotencyKey
from app.schemas.common import Page
from app.schemas.ledger import RepaymentCreate, RepaymentOut, RepaymentUpdate
from app.services import ledger, repayments_list

router = APIRouter(prefix="/repayments", tags=["repayments"])


@router.post("", response_model=RepaymentOut, status_code=status.HTTP_201_CREATED)
def create_repayment(data: RepaymentCreate, db: DB, user: CurrentUser, idempotency_key: IdempotencyKey = None):
    return ledger.create_repayment(db, user.id, data, idempotency_key)


@router.get("", response_model=Page[RepaymentOut])
def list_repayments(
    db: DB,
    user: CurrentUser,
    transaction_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return repayments_list.list_repayments(
        db, user.id, transaction_id=transaction_id, person_id=person_id,
        date_from=date_from, date_to=date_to, page=page, page_size=page_size,
    )


@router.get("/{repayment_id}", response_model=RepaymentOut)
def get_repayment(repayment_id: uuid.UUID, db: DB, user: CurrentUser):
    return ledger.get_repayment(db, user.id, repayment_id)


@router.patch("/{repayment_id}", response_model=RepaymentOut)
def update_repayment(repayment_id: uuid.UUID, data: RepaymentUpdate, db: DB, user: CurrentUser):
    return ledger.update_repayment(db, user.id, repayment_id, data)


@router.delete("/{repayment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_repayment(repayment_id: uuid.UUID, db: DB, user: CurrentUser):
    ledger.delete_repayment(db, user.id, repayment_id)
    return Response(status_code=204)
