"""The end-to-end acceptance workflow from the project brief (section 24), step by step."""

from decimal import Decimal

from tests.conftest import Api, days_ago


def D(x: str) -> Decimal:
    return Decimal(x)


def test_full_acceptance_workflow(client):
    # 1. register + login
    api = Api(client, "owner@example.com")
    login = client.post("/api/v1/auth/login", json={"email": "owner@example.com", "password": api.password})
    assert login.status_code == 200
    api.token = login.json()["access_token"]

    # 2. add Rahim
    rahim = api.person("Rahim", phone="01711000000")

    # 3. lend Rahim 5,000
    loan = api.loan(rahim["id"], "5000", description="Emergency", on=days_ago(20))

    # 4. dashboard reflects the receivable immediately
    s = api.get("/dashboard/summary").json()
    assert s["outstanding_receivable"] == "5000.00" and s["total_lent"] == "5000.00"
    assert s["position"] == "NET_RECEIVABLE" and s["net_position"] == "5000.00"

    # 5-7. Rahim returns 1,000 -> outstanding 4,000
    r1 = api.repay(loan["id"], "1000", on=days_ago(15))
    assert r1["transaction_outstanding"] == "4000.00" and r1["transaction_status"] == "PARTIALLY_PAID"

    # 8-9. returns 2,000 -> outstanding 2,000
    r2 = api.repay(loan["id"], "2000", on=days_ago(10))
    assert r2["transaction_outstanding"] == "2000.00"

    # 10-11. returns the remaining 2,000 -> Fully Paid
    r3 = api.repay(loan["id"], "2000", on=days_ago(5))
    assert r3["transaction_outstanding"] == "0.00" and r3["transaction_status"] == "FULLY_PAID"

    # 12-13. add Karim; Karim lends the user 3,000
    karim = api.person("Karim")
    debt = api.loan(karim["id"], "3000", "BORROWED", on=days_ago(8))

    # 14. dashboard reflects the payable
    s = api.get("/dashboard/summary").json()
    assert s["outstanding_payable"] == "3000.00" and s["position"] == "NET_PAYABLE" and s["net_position"] == "-3000.00"

    # 15-16. user returns 1,000 to Karim -> payable 2,000
    k1 = api.repay(debt["id"], "1000", on=days_ago(2))
    assert k1["direction"] == "RETURNED" and k1["transaction_outstanding"] == "2000.00"

    # 17. individual profiles show correct balances
    pr = api.get(f"/people/{rahim['id']}").json()["balances"]
    assert pr == {
        "total_lent": "5000.00", "total_borrowed": "0.00", "repaid_to_me": "5000.00", "repaid_by_me": "0.00",
        "receivable": "0.00", "payable": "0.00", "net_balance": "0.00",
    }
    pk = api.get(f"/people/{karim['id']}").json()["balances"]
    assert pk["total_borrowed"] == "3000.00" and pk["repaid_by_me"] == "1000.00"
    assert pk["payable"] == "2000.00" and pk["receivable"] == "0.00" and pk["net_balance"] == "-2000.00"

    # 18. history preserves every transaction and every repayment
    led = api.get("/transactions", params={"page_size": 100}).json()
    assert led["total"] == 6  # 2 loans + 4 repayments
    types = sorted(e["entry_type"] for e in led["items"])
    assert types == sorted(["LENT", "BORROWED", "REPAYMENT_RECEIVED"] * 1 + ["REPAYMENT_RECEIVED"] * 2 + ["REPAYMENT_RETURNED"])
    detail = api.get(f"/transactions/{loan['id']}").json()
    assert [r["amount"] for r in detail["repayments"]] == ["1000.00", "2000.00", "2000.00"]
    assert detail["amount"] == "5000.00"

    # 19. dashboard, reports and charts agree
    s = api.get("/dashboard/summary").json()
    ch = api.get("/dashboard/charts").json()
    rep = api.get("/reports/summary").json()
    mon = api.get("/reports/monthly").json()
    ppl = api.get("/reports/people").json()
    yr = api.get("/reports/yearly").json()

    assert s["total_lent"] == "5000.00" and s["total_borrowed"] == "3000.00"
    assert s["total_received_back"] == "5000.00" and s["total_returned"] == "1000.00"
    assert s["outstanding_receivable"] == "0.00" and s["outstanding_payable"] == "2000.00"
    assert s["net_position"] == "-2000.00"

    assert rep["lent"] == s["total_lent"] and rep["borrowed"] == s["total_borrowed"]
    assert rep["repayments_received"] == s["total_received_back"] and rep["repayments_returned"] == s["total_returned"]
    assert rep["outstanding_receivable"] == s["outstanding_receivable"] and rep["outstanding_payable"] == s["outstanding_payable"]
    assert rep["net_position"] == s["net_position"]

    chart_tot = {k: sum(D(m[k]) for m in ch["months"]) for k in ("lent", "borrowed", "received", "returned")}
    assert chart_tot == {"lent": D("5000"), "borrowed": D("3000"), "received": D("5000"), "returned": D("1000")}
    assert ch["receivable"] == s["outstanding_receivable"] and ch["payable"] == s["outstanding_payable"]
    assert (mon["totals"]["lent"], mon["totals"]["borrowed"], mon["totals"]["received"], mon["totals"]["returned"]) == ("5000.00", "3000.00", "5000.00", "1000.00")
    assert ppl["totals"]["receivable"] == "0.00" and ppl["totals"]["payable"] == "2000.00" and ppl["totals"]["net_balance"] == "-2000.00"
    assert len(yr["rows"]) >= 1 and sum(D(r["lent"]) for r in yr["rows"]) == D("5000")

    # 20. "refresh": a brand-new login (fresh token, fresh DB sessions) sees identical data
    again = client.post("/api/v1/auth/login", json={"email": "owner@example.com", "password": api.password}).json()["access_token"]
    h = {"Authorization": f"Bearer {again}"}
    assert client.get("/api/v1/dashboard/summary", headers=h).json() == s
    assert client.get("/api/v1/transactions", headers=h, params={"page_size": 100}).json()["total"] == 6

    # 21. a different authenticated user cannot see any of it
    other = Api(client, "stranger@example.com")
    assert other.get("/dashboard/summary").json()["total_lent"] == "0.00"
    assert other.get("/transactions").json()["total"] == 0
    assert other.get(f"/transactions/{loan['id']}").status_code == 404
    assert other.get(f"/people/{rahim['id']}").status_code == 404
