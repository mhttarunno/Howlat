from decimal import Decimal

from sqlalchemy import text

from app.db.session import engine
from tests.conftest import days_ago, uid


# ------------------------------------------------------------------ people


def test_people_crud_search_archive(alice):
    p = alice.person("Rahim", phone="01711", email="", address="  ", notes="friend")
    assert p["email"] is None and p["address"] is None  # blanks stored as NULL
    assert alice.person("Karim")["balances"]["receivable"] == "0.00"

    assert [x["name"] for x in alice.get("/people", params={"search": "rah"}).json()["items"]] == ["Rahim"]
    assert alice.get("/people", params={"search": "%"}).json()["total"] == 0  # LIKE wildcards are escaped

    r = alice.patch(f"/people/{p['id']}", {"phone": "01999", "notes": None})
    assert r.status_code == 200 and r.json()["phone"] == "01999" and r.json()["notes"] is None
    assert alice.patch(f"/people/{p['id']}", {"name": "   "}).status_code == 422
    assert alice.patch(f"/people/{p['id']}", {"email": "not-an-email"}).status_code == 422

    assert alice.post("/people", {"name": ""}).status_code == 422

    r = alice.delete(f"/people/{p['id']}")
    assert r.status_code == 200 and r.json()["archived_at"]
    assert [x["name"] for x in alice.get("/people").json()["items"]] == ["Karim"]
    assert [x["name"] for x in alice.get("/people", params={"status": "archived"}).json()["items"]] == ["Rahim"]
    assert alice.get("/people", params={"status": "all"}).json()["total"] == 2
    assert alice.post(f"/people/{p['id']}/restore").json()["archived_at"] is None
    assert alice.post(f"/people/{p['id']}/restore").status_code == 409


def test_archived_person_keeps_history_but_blocks_new_loans(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    alice.delete(f"/people/{p['id']}")
    # existing loan still counted and visible
    assert alice.get("/dashboard/summary").json()["outstanding_receivable"] == "1000.00"
    assert alice.get(f"/transactions/{t['id']}").status_code == 200
    # but no new loans
    r = alice.post("/transactions", {"person_id": p["id"], "transaction_type": "LENT", "amount": "5", "transaction_date": days_ago(0).isoformat()})
    assert r.status_code == 409
    # repayments on the old loan still allowed
    alice.repay(t["id"], 100)


def test_same_person_can_be_both_lender_and_borrower(alice):
    p = alice.person("Dual")
    alice.loan(p["id"], 1000, "LENT")
    alice.loan(p["id"], 400, "BORROWED")
    b = alice.get(f"/people/{p['id']}").json()["balances"]
    assert b["receivable"] == "1000.00" and b["payable"] == "400.00" and b["net_balance"] == "600.00"
    assert b["total_lent"] == "1000.00" and b["total_borrowed"] == "400.00"


# ------------------------------------------------------------------ loans


def test_create_loan_fields_and_defaults(alice):
    p = alice.person()
    t = alice.loan(p["id"], "5000", description="Rent help", expected_date=days_ago(-30).isoformat(), notes="n")
    assert t["transaction_type"] == "LENT" and t["amount"] == "5000.00"
    assert t["paid_total"] == "0.00" and t["outstanding"] == "5000.00" and t["status"] == "UNPAID"
    assert t["is_overdue"] is False and t["repayments"] == [] and len(t["ref"]) == 8


def test_amount_validation(alice):
    p = alice.person()
    base = {"person_id": p["id"], "transaction_type": "LENT", "transaction_date": days_ago(0).isoformat()}
    for bad in ["0", "-5", "0.00", "1.234", "abc", "", "1e400", "NaN", "Infinity", "10000000000000"]:
        r = alice.post("/transactions", {**base, "amount": bad})
        assert r.status_code == 422, (bad, r.text)
    for bad_type in ["GIFT", "lent", ""]:
        assert alice.post("/transactions", {**base, "amount": "5", "transaction_type": bad_type}).status_code == 422
    assert alice.post("/transactions", {**base, "amount": "5", "expected_date": days_ago(5).isoformat()}).status_code == 422
    # max NUMERIC(14,2) boundary works
    assert alice.post("/transactions", {**base, "amount": "999999999999.99"}).status_code == 201


def test_decimal_precision_no_float_drift(alice):
    p = alice.person()
    t = alice.loan(p["id"], "0.30")
    alice.repay(t["id"], "0.10")
    alice.repay(t["id"], "0.20")
    t = alice.get(f"/transactions/{t['id']}").json()
    assert t["paid_total"] == "0.30" and t["outstanding"] == "0.00" and t["status"] == "FULLY_PAID"
    # JSON numbers (floats) are accepted but converted exactly
    r = alice.post("/transactions", {"person_id": p["id"], "transaction_type": "LENT", "amount": 1234.5, "transaction_date": days_ago(0).isoformat()})
    assert r.json()["amount"] == "1234.50"


def test_client_cannot_inject_balances_or_ids(alice, bob):
    p = alice.person()
    r = alice.post("/transactions", {
        "person_id": p["id"], "transaction_type": "LENT", "amount": "100", "transaction_date": days_ago(0).isoformat(),
        "user_id": bob.user_id, "paid_total": "100", "outstanding": "0", "status": "FULLY_PAID", "id": uid(),
    })
    assert r.status_code == 201
    t = r.json()
    assert t["outstanding"] == "100.00" and t["status"] == "UNPAID" and t["paid_total"] == "0.00"
    with engine.connect() as c:
        assert c.execute(text("select user_id::text from transactions")).scalar_one() == alice.user_id


# ------------------------------------------------------------------ repayments


def test_partial_then_full_repayment_statuses(alice):
    p = alice.person()
    t = alice.loan(p["id"], 5000)
    steps = [(1000, "4000.00", "PARTIALLY_PAID"), (2000, "2000.00", "PARTIALLY_PAID"), (2000, "0.00", "FULLY_PAID")]
    for amt, outstanding, status in steps:
        rep = alice.repay(t["id"], amt)
        assert rep["transaction_outstanding"] == outstanding and rep["transaction_status"] == status
        assert rep["direction"] == "RECEIVED" and rep["person_name"] == "Rahim"
    full = alice.get(f"/transactions/{t['id']}").json()
    assert full["amount"] == "5000.00"  # original never overwritten
    assert [r["amount"] for r in full["repayments"]] == ["1000.00", "2000.00", "2000.00"]


def test_overpayment_rejected_and_nothing_changes(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    alice.repay(t["id"], 600)
    r = alice.post("/repayments", {"transaction_id": t["id"], "amount": "400.01", "repayment_date": days_ago(0).isoformat()})
    assert r.status_code == 422 and "400.00" in r.json()["detail"]
    t2 = alice.get(f"/transactions/{t['id']}").json()
    assert t2["paid_total"] == "600.00" and len(t2["repayments"]) == 1
    alice.repay(t["id"], "400.00")  # exact remainder is fine


def test_zero_negative_and_malformed_repayments_rejected(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    for bad in ["0", "-1", "0.001", "x", ""]:
        r = alice.post("/repayments", {"transaction_id": t["id"], "amount": bad, "repayment_date": days_ago(0).isoformat()})
        assert r.status_code == 422, bad
    assert alice.get(f"/transactions/{t['id']}").json()["paid_total"] == "0.00"


def test_fully_paid_rejects_more(alice):
    p = alice.person()
    t = alice.loan(p["id"], 100)
    alice.repay(t["id"], 100)
    r = alice.post("/repayments", {"transaction_id": t["id"], "amount": "1", "repayment_date": days_ago(0).isoformat()})
    assert r.status_code == 409 and "fully paid" in r.json()["detail"].lower()


def test_repayment_must_match_transaction_and_person(alice):
    rahim, karim = alice.person("Rahim"), alice.person("Karim")
    t = alice.loan(rahim["id"], 1000)
    r = alice.post("/repayments", {"transaction_id": t["id"], "person_id": karim["id"], "amount": "10", "repayment_date": days_ago(0).isoformat()})
    assert r.status_code == 422
    assert alice.post("/repayments", {"transaction_id": t["id"], "person_id": rahim["id"], "amount": "10", "repayment_date": days_ago(0).isoformat()}).status_code == 201
    assert alice.post("/repayments", {"transaction_id": uid(), "amount": "10", "repayment_date": days_ago(0).isoformat()}).status_code == 404


def test_repayment_date_cannot_precede_loan(alice):
    p = alice.person()
    t = alice.loan(p["id"], 100, on=days_ago(5))
    alice.repay(t["id"], 10, on=days_ago(6), expect=422)
    alice.repay(t["id"], 10, on=days_ago(5))


def test_borrowed_repayment_direction(alice):
    p = alice.person("Karim")
    t = alice.loan(p["id"], 3000, "BORROWED")
    rep = alice.repay(t["id"], 1000)
    assert rep["direction"] == "RETURNED" and rep["transaction_outstanding"] == "2000.00"
    d = alice.get("/dashboard/summary").json()
    assert d["outstanding_payable"] == "2000.00" and d["outstanding_receivable"] == "0.00"


def test_edit_repayment_rechecks_balance(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    r1 = alice.repay(t["id"], 300)
    alice.repay(t["id"], 500)
    assert alice.patch(f"/repayments/{r1['id']}", {"amount": "600"}).status_code == 422  # 600+500 > 1000
    r = alice.patch(f"/repayments/{r1['id']}", {"amount": "500", "payment_method": "bKash", "description": "  "})
    assert r.status_code == 200 and r.json()["transaction_outstanding"] == "0.00"
    assert r.json()["transaction_status"] == "FULLY_PAID" and r.json()["description"] is None


def test_delete_repayment_restores_balance(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    r = alice.repay(t["id"], 1000)
    assert alice.get(f"/transactions/{t['id']}").json()["status"] == "FULLY_PAID"
    assert alice.delete(f"/repayments/{r['id']}").status_code == 204
    t2 = alice.get(f"/transactions/{t['id']}").json()
    assert t2["status"] == "UNPAID" and t2["outstanding"] == "1000.00" and t2["repayments"] == []
    assert alice.get(f"/repayments/{r['id']}").status_code == 404
    with engine.connect() as c:  # soft-deleted, not destroyed
        assert c.execute(text("select count(*) from repayments where deleted_at is not null")).scalar_one() == 1


# ------------------------------------------------------------------ editing / deleting loans


def test_edit_transaction_rules(alice):
    p, p2 = alice.person("A"), alice.person("B")
    t = alice.loan(p["id"], 1000, on=days_ago(10))
    alice.repay(t["id"], 400, on=days_ago(3))

    assert alice.patch(f"/transactions/{t['id']}", {"amount": "399"}).status_code == 422  # below already repaid
    assert alice.patch(f"/transactions/{t['id']}", {"transaction_date": days_ago(2).isoformat()}).status_code == 422
    r = alice.patch(f"/transactions/{t['id']}", {"amount": "400"})
    assert r.status_code == 200 and r.json()["status"] == "FULLY_PAID"
    r = alice.patch(f"/transactions/{t['id']}", {"amount": "2000", "description": "fixed", "person_id": p2["id"], "expected_date": days_ago(-9).isoformat()})
    assert r.status_code == 200
    j = r.json()
    assert j["amount"] == "2000.00" and j["outstanding"] == "1600.00" and j["person_name"] == "B" and j["description"] == "fixed"
    # clearing expected date with explicit null
    assert alice.patch(f"/transactions/{t['id']}", {"expected_date": None}).json()["expected_date"] is None
    # type is immutable (ignored if sent)
    assert alice.patch(f"/transactions/{t['id']}", {"transaction_type": "BORROWED"}).json()["transaction_type"] == "LENT"


def test_delete_transaction_is_soft_with_audit_snapshot(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000, description="gone soon")
    alice.repay(t["id"], 250)
    assert alice.delete(f"/transactions/{t['id']}").status_code == 204
    assert alice.get(f"/transactions/{t['id']}").status_code == 404
    assert alice.get("/transactions").json()["total"] == 0
    s = alice.get("/dashboard/summary").json()
    assert s["total_lent"] == "0.00" and s["outstanding_receivable"] == "0.00" and s["total_received_back"] == "0.00"
    assert alice.get("/repayments").json()["total"] == 0
    assert alice.delete(f"/transactions/{t['id']}").status_code == 404

    with engine.connect() as c:
        assert c.execute(text("select count(*) from transactions where deleted_at is not null")).scalar_one() == 1
        snap = c.execute(text("select before from audit_logs where entity_type='transaction' and action='DELETE'")).scalar_one()
    assert snap["amount"] == "1000.00" and snap["description"] == "gone soon"
    assert snap["repayments"][0]["amount"] == "250.00"


def test_audit_trail_records_changes(alice):
    p = alice.person()
    t = alice.loan(p["id"], 1000)
    alice.patch(f"/transactions/{t['id']}", {"amount": "1500"})
    alice.patch(f"/transactions/{t['id']}", {"amount": "1500"})  # no-op: no audit row
    with engine.connect() as c:
        rows = c.execute(text("select action, before->>'amount', after->>'amount' from audit_logs where entity_type='transaction' order by created_at, id")).all()
    actions = [r[0] for r in rows]
    assert actions.count("CREATE") == 1 and actions.count("UPDATE") == 1
    upd = [r for r in rows if r[0] == "UPDATE"][0]
    assert (upd[1], upd[2]) == ("1000.00", "1500.00")


# ------------------------------------------------------------------ idempotency


def test_idempotency_keys_prevent_duplicate_submissions(alice):
    p = alice.person()
    body = {"person_id": p["id"], "transaction_type": "LENT", "amount": "700", "transaction_date": days_ago(0).isoformat()}
    a = alice.post("/transactions", body, headers={"Idempotency-Key": "k-1"})
    b = alice.post("/transactions", body, headers={"Idempotency-Key": "k-1"})
    assert a.status_code == b.status_code == 201 and a.json()["id"] == b.json()["id"]
    assert alice.get("/transactions").json()["total"] == 1

    rb = {"transaction_id": a.json()["id"], "amount": "300", "repayment_date": days_ago(0).isoformat()}
    r1 = alice.post("/repayments", rb, headers={"Idempotency-Key": "rk-1"})
    r2 = alice.post("/repayments", rb, headers={"Idempotency-Key": "rk-1"})
    assert r1.json()["id"] == r2.json()["id"]
    assert alice.get(f"/transactions/{a.json()['id']}").json()["paid_total"] == "300.00"
    # a different key is a genuinely new repayment
    assert alice.post("/repayments", rb, headers={"Idempotency-Key": "rk-2"}).status_code == 201
