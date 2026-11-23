import os
import uuid
from datetime import date, timedelta

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql://postgres@localhost:5433/howlat_test")
assert "test" in TEST_DB.rsplit("/", 1)[-1], "Refusing to run tests against a database whose name lacks 'test'"
os.environ["DATABASE_URL"] = TEST_DB
os.environ.setdefault("JWT_SECRET", "test-secret-test-secret-test-secret-0123")
os.environ["APP_ENV"] = "test"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["ALLOW_REGISTRATION"] = "true"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services import auth as auth_service  # noqa: E402
from app.utils.dates import today_local  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _migrate():
    """Build the schema with the real Alembic migration so migrations are tested too."""
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "migrations"))
    with engine.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
def _clean():
    auth_service.reset_throttle()
    with engine.begin() as c:
        c.execute(text("TRUNCATE users CASCADE"))
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


class Api:
    """Tiny authenticated API helper."""

    def __init__(self, client: TestClient, email: str, password: str = "correct-horse-battery"):
        self.c = client
        self.email = email
        self.password = password
        r = client.post("/api/v1/auth/register", json={"email": email, "password": password, "full_name": email.split("@")[0].title()})
        assert r.status_code == 201, r.text
        self.token = r.json()["access_token"]
        self.user_id = r.json()["user"]["id"]

    @property
    def h(self):
        return {"Authorization": f"Bearer {self.token}"}

    def get(self, url, **kw):
        return self.c.get(f"/api/v1{url}", headers=self.h, **kw)

    def post(self, url, json=None, headers=None, **kw):
        return self.c.post(f"/api/v1{url}", json=json, headers={**self.h, **(headers or {})}, **kw)

    def patch(self, url, json=None, **kw):
        return self.c.patch(f"/api/v1{url}", json=json, headers=self.h, **kw)

    def delete(self, url, **kw):
        return self.c.delete(f"/api/v1{url}", headers=self.h, **kw)

    # --- domain shortcuts
    def person(self, name="Rahim", **extra) -> dict:
        r = self.post("/people", {"name": name, **extra})
        assert r.status_code == 201, r.text
        return r.json()

    def loan(self, person_id, amount, kind="LENT", on=None, **extra) -> dict:
        body = {
            "person_id": person_id,
            "transaction_type": kind,
            "amount": str(amount),
            "transaction_date": (on or today_local()).isoformat(),
            **extra,
        }
        r = self.post("/transactions", body)
        assert r.status_code == 201, r.text
        return r.json()

    def repay(self, txn_id, amount, on=None, expect=201, **extra) -> dict:
        body = {
            "transaction_id": txn_id,
            "amount": str(amount),
            "repayment_date": (on or today_local()).isoformat(),
            **extra,
        }
        r = self.post("/repayments", body)
        assert r.status_code == expect, r.text
        return r.json()


@pytest.fixture
def alice(client):
    return Api(client, "alice@example.com")


@pytest.fixture
def bob(client):
    return Api(client, "bob@example.com")


def days_ago(n: int) -> date:
    return today_local() - timedelta(days=n)


def uid() -> str:
    return str(uuid.uuid4())
