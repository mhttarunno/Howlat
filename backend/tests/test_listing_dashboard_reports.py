import csv
import io
from decimal import Decimal

from openpyxl import load_workbook

from app.services.exporter import bdt_group
from app.utils.dates import add_months, month_start, resolve_range, today_local
from tests.conftest import days_ago
from datetime import date


def _seed(api):
    rahim, karim, salma = api.person("Rahim"), api.person("Karim"), api.person("Salma")
    a = api.loan(rahim["id"], 5000, "LENT", on=days_ago(40), description="Alpha loan")
    b = api.loan(karim["id"], 3000, "BORROWED", on=days_ago(20), description="Beta debt")
    c = api.loan(salma["id"], 800, "LENT", on=days_ago(3), description="Gamma_100%")
    api.repay(a["id"], 1000, on=days_ago(30), payment_method="Cash")
    api.repay(a["id"], 2000, on=days_ago(10))
    api.repay(b["id"], 1000, on=days_ago(5))
    return rahim, karim, salma, a, b, c


# ------------------------------------------------------------------ unified listing


def test_unified_listing_filters_sort_paginate(alice):
    rahim, karim, salma, a, b, c = _seed(alice)
    r = alice.get("/transactions", params={"page_size": 100}).json()
    assert r["total"] == 6 and r["pages"] == 1

    def q(**p):
        return alice.get("/transactions", params={"page_size": 100, **p}).json()

    assert q(type="LENT")["total"] == 2
    assert q(type=["REPAYMENT_RECEIVED", "REPAYMENT_RETURNED"])["total"] == 3
    assert q(type="REPAYMENT_RETURNED")["items"][0]["person_name"] == "Karim"
    assert q(person_id=rahim["id"])["total"] == 3
    assert q(status="FULLY_PAID")["total"] == 0
    assert q(status="PARTIALLY_PAID")["total"] == 5  # 2 loans + 3 repayments of partially-paid loans...
    assert q(status="UNPAID")["total"] == 1  # only Salma's loan
    assert q(search="alpha")["total"] == 1
    assert q(search="karim")["total"] == 2
    assert q(search="100%")["total"] == 1 and q(search="%")["total"] == 1  # wildcard escaped, only literal % matches
    assert q(search="_")["total"] == 1  # literal underscore only
    assert q(date_from=days_ago(11).isoformat())["total"] == 3  # Salma loan + repayments from 10d and 5d ago
    assert q(date_from=days_ago(31).isoformat(), date_to=days_ago(9).isoformat())["total"] == 3
    assert q(range="last_7_days")["total"] == 2
    ids = {e["transaction_id"] for e in q(search=a["ref"][:6])["items"]}
    assert a["id"] in ids  # search by transaction ref

    asc = [e["amount"] for e in q(sort="amount", order="asc")["items"]]
    assert [Decimal(x) for x in asc] == sorted(Decimal(x) for x in asc)
    dates = [e["entry_date"] for e in q(sort="date", order="desc")["items"]]
    assert dates == sorted(dates, reverse=True)

    p1 = alice.get("/transactions", params={"page_size": 4, "page": 1}).json()
    p2 = alice.get("/transactions", params={"page_size": 4, "page": 2}).json()
    assert (len(p1["items"]), len(p2["items"]), p1["pages"]) == (4, 2, 2)
    assert not ({e["id"] for e in p1["items"]} & {e["id"] for e in p2["items"]})

    assert alice.get("/transactions", params={"page_size": 101}).status_code == 422
    assert alice.get("/transactions", params={"sort": "evil; drop table users"}).status_code == 422


def test_open_filter_returns_only_loans_with_balance(alice):
    p = alice.person()
    done = alice.loan(p["id"], 100)
    alice.repay(done["id"], 100)
    open_ = alice.loan(p["id"], 200)
    items = alice.get("/transactions", params={"open": True}).json()["items"]
    assert [e["transaction_id"] for e in items] == [open_["id"]]  # no repayments, no settled loans


def test_listing_rows_carry_loan_context(alice):
    _, _, _, a, *_ = _seed(alice)
    rows = {e["entry_type"] + e["amount"]: e for e in alice.get("/transactions", params={"person_id": a["person_id"]}).json()["items"]}
    loan = rows["LENT5000.00"]
    assert (loan["paid_total"], loan["outstanding"], loan["status"]) == ("3000.00", "2000.00", "PARTIALLY_PAID")
    rep = rows["REPAYMENT_RECEIVED1000.00"]
    assert rep["transaction_id"] == a["id"] and rep["loan_amount"] == "5000.00" and rep["payment_method"] == "Cash"


def test_money_given_and_received_views(alice):
    _seed(alice)
    given = alice.get("/transactions", params={"type": "LENT"}).json()["items"]
    received = alice.get("/transactions", params={"type": "BORROWED"}).json()["items"]
    assert {e["person_name"] for e in given} == {"Rahim", "Salma"} and [e["person_name"] for e in received] == ["Karim"]
    assert received[0]["outstanding"] == "2000.00"


# ------------------------------------------------------------------ dashboard


def test_dashboard_summary_matches_per_loan_math(alice):
    _seed(alice)
    s = alice.get("/dashboard/summary").json()
    assert s["total_lent"] == "5800.00" and s["total_borrowed"] == "3000.00"
    assert s["total_received_back"] == "3000.00" and s["total_returned"] == "1000.00"
    assert s["outstanding_receivable"] == "2800.00" and s["outstanding_payable"] == "2000.00"
    assert s["net_position"] == "800.00" and s["position"] == "NET_RECEIVABLE"
    assert (s["open_receivables"], s["open_payables"]) == (2, 1)

    # cross-check against summing outstanding of every individual loan
    loans = alice.get("/transactions", params={"type": ["LENT", "BORROWED"], "page_size": 100}).json()["items"]
    rec = sum(Decimal(x["outstanding"]) for x in loans if x["entry_type"] == "LENT")
    pay = sum(Decimal(x["outstanding"]) for x in loans if x["entry_type"] == "BORROWED")
    assert (str(rec), str(pay)) == ("2800.00", "2000.00")

    assert [(r["name"], r["receivable"]) for r in s["top_receivables"]] == [("Rahim", "2000.00"), ("Salma", "800.00")]
    assert [(r["name"], r["payable"]) for r in s["top_payables"]] == [("Karim", "2000.00")]


def test_dashboard_empty_state(alice):
    s = alice.get("/dashboard/summary").json()
    assert s["position"] == "SETTLED" and s["net_position"] == "0.00" and s["top_receivables"] == []
    ch = alice.get("/dashboard/charts").json()
    assert len(ch["months"]) == 12 and all(m["lent"] == "0.00" for m in ch["months"])
    assert alice.get("/dashboard/recent-activity").json()["items"] == []


def test_recent_activity_latest_first(alice):
    _seed(alice)
    items = alice.get("/dashboard/recent-activity", params={"limit": 3}).json()["items"]
    assert len(items) == 3 and items[0]["entry_type"] == "REPAYMENT_RETURNED"
    assert {"person_name", "entry_type", "amount", "entry_date", "description", "status"} <= set(items[0])


def test_charts_months_and_totals(alice):
    _seed(alice)
    ch = alice.get("/dashboard/charts", params={"months": 3}).json()
    assert len(ch["months"]) == 3
    assert ch["months"][-1]["month"] == f"{today_local().year:04d}-{today_local().month:02d}"
    assert alice.get("/dashboard/charts", params={"months": 99}).status_code == 422


# ------------------------------------------------------------------ notifications


def test_notifications_overdue_and_upcoming(alice):
    p = alice.person("Rahim")
    k = alice.person("Karim")
    alice.loan(p["id"], 1000, "LENT", on=days_ago(30), expected_date=days_ago(5).isoformat())       # overdue receivable
    alice.loan(p["id"], 500, "LENT", on=days_ago(1), expected_date=days_ago(-3).isoformat())         # upcoming receivable
    alice.loan(k["id"], 700, "BORROWED", on=days_ago(30), expected_date=days_ago(1).isoformat())     # overdue payable
    alice.loan(k["id"], 300, "BORROWED", on=days_ago(1), expected_date=days_ago(0).isoformat())      # due today payable
    alice.loan(k["id"], 100, "BORROWED", on=days_ago(1), expected_date=days_ago(-30).isoformat())    # far future: excluded
    paid = alice.loan(p["id"], 200, "LENT", on=days_ago(30), expected_date=days_ago(2).isoformat())
    alice.repay(paid["id"], 200)                                                                     # settled: excluded

    n = alice.get("/notifications").json()
    c = n["counts"]
    assert (c["overdue_receivable"], c["upcoming_receivable"], c["overdue_payable"], c["upcoming_payable"]) == (1, 1, 1, 1)
    assert c["total"] == 4 and c["overdue_receivable_amount"] == "1000.00" and c["upcoming_payable_amount"] == "300.00"
    first = n["items"][0]
    assert first["kind"] == "OVERDUE" and first["days"] == 5 and first["direction"] == "RECEIVABLE"
    assert alice.get("/dashboard/summary").json()["overdue_receivables"] == 1
    flagged = alice.get("/transactions", params={"overdue": True}).json()
    assert flagged["total"] == 2 and all(e["is_overdue"] for e in flagged["items"])


# ------------------------------------------------------------------ reports


def test_report_summary_ranges_and_consistency(alice):
    _seed(alice)
    full = alice.get("/reports/summary").json()
    assert full["lent"] == "5800.00" and full["repayments_received"] == "3000.00"

    last7 = alice.get("/reports/summary", params={"range": "last_7_days"}).json()
    assert last7["lent"] == "800.00" and last7["borrowed"] == "0.00" and last7["repayments_returned"] == "1000.00"
    assert last7["outstanding_receivable"] == full["outstanding_receivable"]  # position is "as of now"

    custom = alice.get("/reports/summary", params={"range": "custom", "start": days_ago(45).isoformat(), "end": days_ago(25).isoformat()}).json()
    assert custom["lent"] == "5000.00" and custom["repayments_received"] == "1000.00"
    assert alice.get("/reports/summary", params={"range": "custom", "start": "2026-02-01", "end": "2026-01-01"}).status_code == 422
    assert alice.get("/reports/summary", params={"range": "bogus"}).status_code == 422
    for preset in ("today", "last_7_days", "last_30_days", "this_month", "last_month", "this_year", "all"):
        assert alice.get("/reports/summary", params={"range": preset}).status_code == 200, preset


def test_monthly_yearly_people_reports(alice):
    _seed(alice)
    m = alice.get("/reports/monthly").json()
    assert len(m["rows"]) == 12
    assert sum(Decimal(r["lent"]) for r in m["rows"]) == Decimal(m["totals"]["lent"]) == Decimal("5800")
    assert m["totals"]["loan_count"] == 3 and m["totals"]["repayment_count"] == 3

    y = alice.get("/reports/yearly").json()["rows"]
    assert sum(Decimal(r["borrowed"]) for r in y) == Decimal("3000")

    p = alice.get("/reports/people").json()
    by = {r["name"]: r for r in p["rows"]}
    assert by["Rahim"]["receivable"] == "2000.00" and by["Karim"]["payable"] == "2000.00" and by["Karim"]["net_balance"] == "-2000.00"
    assert p["totals"]["net_balance"] == "800.00"
    assert alice.get("/reports/monthly", params={"range": "this_month"}).json()["rows"][0]["month"] == f"{today_local().year:04d}-{today_local().month:02d}"


def test_exports_csv_xlsx_pdf(alice):
    _seed(alice)
    alice.person("=cmd|' /C calc'!A0")  # formula-injection attempt in a name
    evil = alice.person("@SUM(1+1)")
    alice.loan(evil["id"], 10, description='=HYPERLINK("http://evil","x")')

    for report in ("transactions", "monthly", "yearly", "people", "outstanding", "summary"):
        for fmt in ("csv", "xlsx", "pdf"):
            r = alice.get("/reports/export", params={"report": report, "format": fmt})
            assert r.status_code == 200, (report, fmt, r.text[:200])
            assert f"howlat-{report}.{fmt}" in r.headers["content-disposition"]
            if fmt == "pdf":
                assert r.content.startswith(b"%PDF")

    # CSV content is accurate and safe
    r = alice.get("/reports/export", params={"report": "transactions", "format": "csv"})
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8-sig"))))
    header = rows[3]
    assert header[:4] == ["Ref", "Date", "Person", "Type"]
    data = rows[4:]
    assert len(data) == 7  # 4 loans + 3 repayments
    assert not any(c.startswith(("=", "@", "+")) for row in data for c in row)
    assert any(c.startswith("'=HYPERLINK") for row in data for c in row)

    people_csv = list(csv.reader(io.StringIO(alice.get("/reports/export", params={"report": "people", "format": "csv"}).content.decode("utf-8-sig"))))
    total_row = next(r for r in people_csv if r and r[0] == "Total")
    assert (total_row[5], total_row[6], total_row[7]) == ("2810.00", "2000.00", "810.00")

    # XLSX opens, numbers are real numbers, formulas are not evaluated
    wb = load_workbook(io.BytesIO(alice.get("/reports/export", params={"report": "transactions", "format": "xlsx"}).content))
    ws = wb.active
    cells = [c for row in ws.iter_rows(min_row=5) for c in row]
    assert all(c.data_type != "f" for c in cells)
    amounts = [c.value for c in ws["E"][4:] if c.value is not None]
    assert all(isinstance(v, (int, float, Decimal)) for v in amounts) and len(amounts) == 7

    assert alice.get("/reports/export", params={"report": "nope", "format": "csv"}).status_code == 422
    assert alice.get("/reports/export", params={"report": "summary", "format": "doc"}).status_code == 422


def test_export_matches_dashboard_figures(alice):
    _seed(alice)
    s = alice.get("/dashboard/summary").json()
    rows = list(csv.reader(io.StringIO(alice.get("/reports/export", params={"report": "summary", "format": "csv"}).content.decode("utf-8-sig"))))
    m = {r[0]: r[1] for r in rows if len(r) == 2}
    assert m["Outstanding receivable (current)"] == s["outstanding_receivable"]
    assert m["Outstanding payable (current)"] == s["outstanding_payable"]
    assert m["Net position (current)"] == s["net_position"]


# ------------------------------------------------------------------ helpers


def test_bangladeshi_number_grouping():
    cases = {"0": "0.00", "999": "999.00", "1000": "1,000.00", "10000": "10,000.00", "100000": "1,00,000.00",
             "1000000": "10,00,000.00", "12345678.9": "1,23,45,678.90", "-250000": "-2,50,000.00"}
    for raw, want in cases.items():
        assert bdt_group(Decimal(raw)) == want


def test_date_range_presets():
    t = date(2026, 3, 15)
    assert resolve_range("today", None, None, t) == (t, t)
    assert resolve_range("last_7_days", None, None, t) == (date(2026, 3, 9), t)
    assert resolve_range("last_30_days", None, None, t) == (date(2026, 2, 14), t)
    assert resolve_range("this_month", None, None, t) == (date(2026, 3, 1), t)
    assert resolve_range("last_month", None, None, t) == (date(2026, 2, 1), date(2026, 2, 28))
    assert resolve_range("this_year", None, None, t) == (date(2026, 1, 1), t)
    assert resolve_range(None, None, None, t) == (None, None)
    jan = date(2026, 1, 20)
    assert resolve_range("last_month", None, None, jan) == (date(2025, 12, 1), date(2025, 12, 31))
    assert add_months(month_start(jan), -2) == date(2025, 11, 1)
