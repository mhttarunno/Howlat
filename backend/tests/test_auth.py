from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import engine
from tests.conftest import Api


def test_register_login_me(client):
    r = client.post("/api/v1/auth/register", json={"email": "Zed@Example.com", "password": "supersecret1", "full_name": "Zed"})
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["email"] == "zed@example.com"  # normalised
    assert body["user"]["currency"] == "BDT"
    assert "hashed_password" not in r.text

    r = client.post("/api/v1/auth/login", json={"email": "ZED@example.com", "password": "supersecret1"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["email"] == "zed@example.com"


def test_password_is_hashed_with_argon2(client):
    Api(client, "h@example.com")
    with engine.connect() as c:
        h = c.execute(text("select hashed_password from users")).scalar_one()
    assert h.startswith("$argon2")
    assert "correct-horse" not in h


def test_duplicate_email_rejected(client):
    Api(client, "dup@example.com")
    r = client.post("/api/v1/auth/register", json={"email": "DUP@example.com", "password": "supersecret1", "full_name": "X"})
    assert r.status_code == 409


def test_register_validation(client):
    assert client.post("/api/v1/auth/register", json={"email": "nope", "password": "supersecret1", "full_name": "X"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"email": "a@b.co", "password": "short", "full_name": "X"}).status_code == 422
    assert client.post("/api/v1/auth/register", json={"email": "a@b.co", "password": "supersecret1", "full_name": "  "}).status_code == 422


def test_login_wrong_password_and_unknown_user_same_error(client):
    Api(client, "real@example.com")
    a = client.post("/api/v1/auth/login", json={"email": "real@example.com", "password": "wrong-password"})
    b = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "wrong-password"})
    assert a.status_code == b.status_code == 401
    assert a.json()["detail"] == b.json()["detail"]


def test_login_throttle(client):
    Api(client, "t@example.com")
    for _ in range(10):
        assert client.post("/api/v1/auth/login", json={"email": "t@example.com", "password": "nope-nope"}).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": "t@example.com", "password": "correct-horse-battery"})
    assert r.status_code == 429


def test_protected_routes_require_token(client):
    for url in ["/auth/me", "/people", "/transactions", "/repayments", "/dashboard/summary", "/reports/summary", "/notifications"]:
        assert client.get(f"/api/v1{url}").status_code == 401, url
    assert client.get("/api/v1/people", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_tampered_and_expired_tokens_rejected(client, alice):
    s = get_settings()
    now = datetime.now(timezone.utc)
    forged = jwt.encode({"sub": alice.user_id, "tv": 0, "exp": now + timedelta(hours=1)}, "x" * 40, algorithm="HS256")
    expired = jwt.encode({"sub": alice.user_id, "tv": 0, "exp": now - timedelta(minutes=1)}, s.jwt_secret, algorithm="HS256")
    none_alg = jwt.encode({"sub": alice.user_id, "tv": 0, "exp": now + timedelta(hours=1)}, "", algorithm="none")
    for t in (forged, expired, none_alg):
        assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {t}"}).status_code == 401


def test_logout_invalidates_token(client, alice):
    assert alice.get("/auth/me").status_code == 200
    assert alice.post("/auth/logout").status_code == 204
    assert alice.get("/auth/me").status_code == 401
    # logging in again works and issues a fresh valid token
    r = client.post("/api/v1/auth/login", json={"email": alice.email, "password": alice.password})
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}).status_code == 200


def test_change_password(client, alice):
    assert alice.post("/auth/change-password", {"current_password": "WRONG-WRONG", "new_password": "brand-new-pass1"}).status_code == 401
    r = alice.post("/auth/change-password", {"current_password": alice.password, "new_password": "brand-new-pass1"})
    assert r.status_code == 200
    assert alice.get("/auth/me").status_code == 401  # old session dead
    new = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=new).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": alice.email, "password": "brand-new-pass1"}).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": alice.email, "password": alice.password}).status_code == 401


def test_update_profile(alice):
    r = alice.patch("/auth/me", {"full_name": "Alice Rahman", "theme": "dark", "currency": "USD"})
    assert r.status_code == 200
    assert (r.json()["full_name"], r.json()["theme"], r.json()["currency"]) == ("Alice Rahman", "dark", "USD")
    assert alice.patch("/auth/me", {"theme": "neon"}).status_code == 422


def test_delete_account_removes_everything(client, alice, bob):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    alice.repay(t["id"], 100)
    bp = bob.person("Keep")

    assert alice.post("/auth/delete-account", {"password": "wrong-wrong"}).status_code == 401
    assert alice.post("/auth/delete-account", {"password": alice.password}).status_code == 204
    with engine.connect() as c:
        for tbl in ("people", "transactions", "repayments", "audit_logs"):
            assert c.execute(text(f"select count(*) from {tbl} where user_id = :u"), {"u": alice.user_id}).scalar_one() == 0, tbl
        assert c.execute(text("select count(*) from people")).scalar_one() == 1  # bob's untouched
    assert bob.get(f"/people/{bp['id']}").status_code == 200


def test_data_export_contains_all_records(alice):
    p = alice.person()
    t = alice.loan(p["id"], 500)
    alice.repay(t["id"], 100)
    r = alice.get("/auth/export")
    assert r.status_code == 200
    d = r.json()
    assert len(d["people"]) == 1 and len(d["transactions"]) == 1 and len(d["repayments"]) == 1
    assert d["transactions"][0]["amount"] == "500.00"
    assert len(d["audit_log"]) >= 3
    assert "hashed_password" not in r.text


def test_cors_allows_only_configured_origin(client):
    ok = client.options("/api/v1/people", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options("/api/v1/people", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in bad.headers
