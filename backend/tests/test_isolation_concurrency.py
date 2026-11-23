import threading
import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.errors import DomainError
from app.db.session import SessionLocal, engine
from app.schemas.ledger import RepaymentCreate
from app.services import ledger
from tests.conftest import days_ago


def test_user_cannot_read_or_modify_another_users_records(alice, bob):
    p = alice.person("Rahim")
    t = alice.loan(p["id"], 5000)
    rep = alice.repay(t["id"], 1000)

    # every direct access is a 404 (not 403: we do not reveal existence)
    assert bob.get(f"/people/{p['id']}").status_code == 404
    assert bob.patch(f"/people/{p['id']}", {"name": "Hacked"}).status_code == 404
    assert bob.delete(f"/people/{p['id']}").status_code == 404
    assert bob.post(f"/people/{p['id']}/restore").status_code == 404
    assert bob.get(f"/transactions/{t['id']}").status_code == 404
    assert bob.patch(f"/transactions/{t['id']}", {"amount": "1"}).status_code == 404
    assert bob.delete(f"/transactions/{t['id']}").status_code == 404
    assert bob.get(f"/repayments/{rep['id']}").status_code == 404
    assert bob.patch(f"/repayments/{rep['id']}", {"amount": "1"}).status_code == 404
    assert bob.delete(f"/repayments/{rep['id']}").status_code == 404

    # bob cannot attach his data to alice's records
    assert bob.post("/transactions", {"person_id": p["id"], "transaction_type": "LENT", "amount": "5", "transaction_date": days_ago(0).isoformat()}).status_code == 404
    assert bob.post("/repayments", {"transaction_id": t["id"], "amount": "5", "repayment_date": days_ago(0).isoformat()}).status_code == 404

    # lists, dashboards and reports are empty for bob
    assert bob.get("/people").json()["total"] == 0
    assert bob.get("/transactions").json()["total"] == 0
    assert bob.get("/repayments").json()["total"] == 0
    assert bob.get("/transactions", params={"person_id": p["id"]}).json()["total"] == 0
    s = bob.get("/dashboard/summary").json()
    assert s["total_lent"] == "0.00" and s["top_receivables"] == []
    assert bob.get("/reports/people").json()["rows"] == []
    assert bob.get("/reports/summary").json()["lent"] == "0.00"
    for fmt_ in ("csv", "xlsx"):
        body = bob.get("/reports/export", params={"report": "transactions", "format": fmt_}).content
        assert b"Rahim" not in body

    # alice's data is untouched
    assert alice.get(f"/transactions/{t['id']}").json()["outstanding"] == "4000.00"
    assert alice.get(f"/people/{p['id']}").json()["name"] == "Rahim"


def test_database_itself_rejects_cross_user_links(alice, bob):
    """Even a buggy query could not link bob's loan to alice's person: composite FKs forbid it."""
    ap = alice.person()
    at = alice.loan(ap["id"], 100)
    with pytest.raises(IntegrityError):
        with engine.begin() as c:
            c.execute(
                text("insert into transactions (user_id, person_id, transaction_type, amount, transaction_date) "
                     "values (:u, :p, 'LENT', 10, current_date)"),
                {"u": bob.user_id, "p": ap["id"]},
            )
    with pytest.raises(IntegrityError):
        with engine.begin() as c:
            c.execute(
                text("insert into repayments (user_id, transaction_id, amount, repayment_date) "
                     "values (:u, :t, 10, current_date)"),
                {"u": bob.user_id, "t": at["id"]},
            )


def test_database_constraints_reject_bad_money(alice):
    p = alice.person()
    for amount in ("0", "-1"):
        with pytest.raises(IntegrityError):
            with engine.begin() as c:
                c.execute(
                    text("insert into transactions (user_id, person_id, transaction_type, amount, transaction_date) "
                         "values (:u, :p, 'LENT', :a, current_date)"),
                    {"u": alice.user_id, "p": p["id"], "a": amount},
                )
    with pytest.raises(IntegrityError):
        with engine.begin() as c:
            c.execute(
                text("insert into transactions (user_id, person_id, transaction_type, amount, transaction_date) "
                     "values (:u, :p, 'GIFT', 5, current_date)"),
                {"u": alice.user_id, "p": p["id"]},
            )


def _race(user_id, txn_id, amounts, n_threads):
    """Fire repayments at the same loan simultaneously, each on its own DB session."""
    barrier = threading.Barrier(n_threads)
    results: list[str] = [""] * n_threads

    def worker(i):
        db = SessionLocal()
        try:
            barrier.wait()
            ledger.create_repayment(
                db, uuid.UUID(user_id),
                RepaymentCreate(transaction_id=txn_id, amount=amounts[i], repayment_date=date.today()),
            )
            results[i] = "ok"
        except DomainError as e:
            db.rollback()
            results[i] = e.code
        finally:
            db.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n_threads)]
    [t.start() for t in threads]
    [t.join(timeout=30) for t in threads]
    return results


def test_concurrent_repayments_never_exceed_balance(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    # 8 simultaneous repayments of 300 against a 1000 loan: exactly 3 may succeed (900), never 4 (1200).
    results = _race(alice.user_id, t["id"], [Decimal("300")] * 8, 8)
    assert results.count("ok") == 3, results
    assert all(r in ("ok", "validation_failed", "conflict") for r in results), results
    final = alice.get(f"/transactions/{t['id']}").json()
    assert final["paid_total"] == "900.00" and final["outstanding"] == "100.00"
    assert len(final["repayments"]) == 3


def test_concurrent_exact_balance_only_one_wins(alice):
    p = alice.person()
    t = alice.loan(p["id"], 500)
    results = _race(alice.user_id, t["id"], [Decimal("500")] * 6, 6)
    assert results.count("ok") == 1, results
    final = alice.get(f"/transactions/{t['id']}").json()
    assert final["status"] == "FULLY_PAID" and final["paid_total"] == "500.00" and len(final["repayments"]) == 1


def test_concurrent_requests_with_same_idempotency_key_create_one(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    barrier = threading.Barrier(5)
    ids: list[str] = []

    def worker():
        db = SessionLocal()
        try:
            barrier.wait()
            out = ledger.create_repayment(
                db, uuid.UUID(alice.user_id),
                RepaymentCreate(transaction_id=t["id"], amount=Decimal("100"), repayment_date=date.today()),
                idempotency_key="same-key",
            )
            ids.append(str(out.id))
        finally:
            db.close()

    threads = [threading.Thread(target=worker) for _ in range(5)]
    [x.start() for x in threads]
    [x.join(timeout=30) for x in threads]
    assert len(set(ids)) == 1 and len(ids) == 5
    assert alice.get(f"/transactions/{t['id']}").json()["paid_total"] == "100.00"


def test_edit_and_repay_race_cannot_break_invariant(alice):
    """Shrinking a loan while a repayment lands must not leave paid > amount."""
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    barrier = threading.Barrier(2)
    out = {}

    def repay():
        db = SessionLocal()
        try:
            barrier.wait()
            ledger.create_repayment(db, uuid.UUID(alice.user_id), RepaymentCreate(transaction_id=t["id"], amount=Decimal("900"), repayment_date=date.today()))
            out["repay"] = "ok"
        except DomainError as e:
            out["repay"] = e.code
        finally:
            db.close()

    def shrink():
        from app.schemas.ledger import TransactionUpdate
        db = SessionLocal()
        try:
            barrier.wait()
            ledger.update_transaction(db, uuid.UUID(alice.user_id), uuid.UUID(t["id"]), TransactionUpdate(amount=Decimal("500")))
            out["shrink"] = "ok"
        except DomainError as e:
            out["shrink"] = e.code
        finally:
            db.close()

    a, b = threading.Thread(target=repay), threading.Thread(target=shrink)
    a.start(); b.start(); a.join(30); b.join(30)
    final = alice.get(f"/transactions/{t['id']}").json()
    assert Decimal(final["paid_total"]) <= Decimal(final["amount"]), (out, final)
    assert not (out["repay"] == "ok" and out["shrink"] == "ok"), out  # both can't succeed: 900 > 500
