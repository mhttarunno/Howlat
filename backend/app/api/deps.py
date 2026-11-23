import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AuthError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)

DB = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DB, creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
) -> User:
    """Identity always comes from the verified token, never from request bodies or query strings."""
    if creds is None:
        raise AuthError("Not authenticated")
    try:
        claims = decode_access_token(creds.credentials)
        user_id = uuid.UUID(claims["sub"])
        token_version = int(claims["tv"])
    except (jwt.PyJWTError, ValueError, KeyError):
        raise AuthError("Invalid or expired session")
    user = db.get(User, user_id)
    if user is None or user.token_version != token_version:
        raise AuthError("Session is no longer valid. Please sign in again.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

IdempotencyKey = Annotated[str | None, Header(alias="Idempotency-Key", max_length=64)]
