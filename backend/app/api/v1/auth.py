import json
from datetime import datetime, timezone

from fastapi import APIRouter, Response, status
from sqlalchemy import select

from app.api.deps import DB, CurrentUser
from app.models import AuditLog, Person, Repayment, Transaction
from app.schemas.auth import (
    DeleteAccountIn,
    LoginIn,
    PasswordChangeIn,
    RegisterIn,
    TokenOut,
    UserOut,
    UserUpdate,
)
from app.services import auth as svc

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: DB):
    return svc.register(db, data)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: DB):
    return svc.login(db, data)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(db: DB, user: CurrentUser):
    svc.logout(db, user)
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: DB, user: CurrentUser):
    return svc.update_profile(db, user, data)


@router.post("/change-password", response_model=TokenOut)
def change_password(data: PasswordChangeIn, db: DB, user: CurrentUser):
    return svc.change_password(db, user, data)


@router.post("/delete-account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: DeleteAccountIn, db: DB, user: CurrentUser):
    svc.delete_account(db, user, data)
    return Response(status_code=204)


@router.get("/export", summary="Download all of your data as JSON")
def export_my_data(db: DB, user: CurrentUser):
    def rows(model, order):
        return db.execute(select(model).where(model.user_id == user.id).order_by(order)).unique().scalars().all()

    def d(obj, cols):
        out = {}
        for c in cols:
            v = getattr(obj, c)
            out[c] = v.isoformat() if hasattr(v, "isoformat") else (str(v) if v is not None and not isinstance(v, (str, int)) else v)
        return out

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {"email": user.email, "full_name": user.full_name, "currency": user.currency},
        "people": [d(p, ("id", "name", "phone", "email", "address", "notes", "created_at", "archived_at")) for p in rows(Person, Person.created_at)],
        "transactions": [
            d(t, ("id", "person_id", "transaction_type", "amount", "transaction_date", "expected_date", "description", "notes", "created_at", "deleted_at"))
            for t in rows(Transaction, Transaction.created_at)
        ],
        "repayments": [
            d(r, ("id", "transaction_id", "amount", "repayment_date", "payment_method", "description", "notes", "created_at", "deleted_at"))
            for r in rows(Repayment, Repayment.created_at)
        ],
        "audit_log": [
            {**d(a, ("id", "entity_type", "entity_id", "action", "created_at")), "before": a.before, "after": a.after}
            for a in rows(AuditLog, AuditLog.created_at)
        ],
    }
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="howlat-data-export.json"'},
    )
