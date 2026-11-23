import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status

from app.api.deps import DB, CurrentUser
from app.schemas.common import Page
from app.schemas.people import PersonCreate, PersonOut, PersonUpdate
from app.services import people as svc

router = APIRouter(prefix="/people", tags=["people"])


@router.post("", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
def create_person(data: PersonCreate, db: DB, user: CurrentUser):
    return svc.create_person(db, user.id, data)


@router.get("", response_model=Page[PersonOut])
def list_people(
    db: DB,
    user: CurrentUser,
    search: Annotated[str | None, Query(max_length=120)] = None,
    status: Literal["active", "archived", "all"] = "active",
    balance: Literal["owes_me", "i_owe", "settled"] | None = None,
    sort: Literal["name", "receivable", "payable", "net", "created"] = "name",
    order: Literal["asc", "desc"] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return svc.list_people(
        db, user.id, search=search, status=status, balance=balance, sort=sort, order=order,
        page=page, page_size=page_size,
    )


@router.get("/{person_id}", response_model=PersonOut)
def get_person(person_id: uuid.UUID, db: DB, user: CurrentUser):
    return svc.get_person_out(db, user.id, person_id)


@router.patch("/{person_id}", response_model=PersonOut)
def update_person(person_id: uuid.UUID, data: PersonUpdate, db: DB, user: CurrentUser):
    return svc.update_person(db, user.id, person_id, data)


@router.delete("/{person_id}", response_model=PersonOut, summary="Archive a person (history is kept)")
def archive_person(person_id: uuid.UUID, db: DB, user: CurrentUser):
    return svc.archive_person(db, user.id, person_id)


@router.post("/{person_id}/restore", response_model=PersonOut)
def restore_person(person_id: uuid.UUID, db: DB, user: CurrentUser):
    return svc.restore_person(db, user.id, person_id)
