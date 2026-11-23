import time
import uuid
from collections import defaultdict, deque

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AuthError, ConflictError, ForbiddenError, TooManyAttempts
from app.core.security import create_access_token, hash_password, needs_rehash, verify_password
from app.models import AuditLog, Person, Repayment, Transaction, User
from app.schemas.auth import (
    DeleteAccountIn,
    LoginIn,
    PasswordChangeIn,
    RegisterIn,
    TokenOut,
    UserOut,
    UserUpdate,
)

# --- Login throttling (in-memory, per process). Good enough for a single-instance personal app;
# put a shared store (Redis) or a reverse-proxy rate limit in front if you scale out.
_FAIL_WINDOW = 15 * 60
_FAIL_LIMIT = 10
_failures: dict[str, deque[float]] = defaultdict(deque)


def _throttle_check(key: str) -> None:
    now = time.monotonic()
    q = _failures[key]
    while q and now - q[0] > _FAIL_WINDOW:
        q.popleft()
    if len(q) >= _FAIL_LIMIT:
        raise TooManyAttempts("Too many failed login attempts. Try again in a few minutes.")


def _throttle_fail(key: str) -> None:
    _failures[key].append(time.monotonic())


def reset_throttle() -> None:
    _failures.clear()


def _token(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(user.id), user.token_version),
        user=UserOut.model_validate(user),
    )


def register(db: Session, data: RegisterIn) -> TokenOut:
    if not get_settings().allow_registration:
        raise ForbiddenError("Registration is disabled on this server")
    email = data.email.lower()
    exists = db.execute(select(User.id).where(func.lower(User.email) == email)).first()
    if exists:
        raise ConflictError("An account with this email already exists")
    user = User(email=email, hashed_password=hash_password(data.password), full_name=data.full_name)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An account with this email already exists")
    db.refresh(user)
    return _token(user)


def login(db: Session, data: LoginIn) -> TokenOut:
    email = data.email.lower()
    _throttle_check(email)
    user = db.execute(select(User).where(func.lower(User.email) == email)).scalar_one_or_none()
    if not verify_password(data.password, user.hashed_password if user else None):
        _throttle_fail(email)
        raise AuthError("Invalid email or password")
    _failures.pop(email, None)
    if needs_rehash(user.hashed_password):
        user.hashed_password = hash_password(data.password)
        db.commit()
    return _token(user)


def logout(db: Session, user: User) -> None:
    """Invalidates every token issued so far for this user."""
    user.token_version += 1
    db.commit()


def update_profile(db: Session, user: User, data: UserUpdate) -> UserOut:
    for f in data.model_fields_set:
        v = getattr(data, f)
        if v is not None:
            setattr(user, f, v.strip() if isinstance(v, str) else v)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


def change_password(db: Session, user: User, data: PasswordChangeIn) -> TokenOut:
    if not verify_password(data.current_password, user.hashed_password):
        raise AuthError("Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    user.token_version += 1  # sign out all other sessions
    db.commit()
    db.refresh(user)
    return _token(user)


def delete_account(db: Session, user: User, data: DeleteAccountIn) -> None:
    """Permanent. Explicit ordered deletes because transaction/repayment FKs are RESTRICT."""
    if not verify_password(data.password, user.hashed_password):
        raise AuthError("Password is incorrect")
    uid: uuid.UUID = user.id
    db.execute(delete(AuditLog).where(AuditLog.user_id == uid))
    db.execute(delete(Repayment).where(Repayment.user_id == uid))
    db.execute(delete(Transaction).where(Transaction.user_id == uid))
    db.execute(delete(Person).where(Person.user_id == uid))
    db.execute(delete(User).where(User.id == uid))
    db.commit()
