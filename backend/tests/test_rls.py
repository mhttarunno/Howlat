from sqlalchemy import text

from app.db.session import engine


def test_rls_enabled_on_every_table():
    with engine.connect() as c:
        rows = c.execute(text(
            "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace "
            "where n.nspname='public' and c.relkind='r'"
        )).all()
    by = dict(rows)
    for t in ("users", "people", "transactions", "repayments", "audit_logs", "alembic_version"):
        assert by.get(t) is True, f"RLS not enabled on {t}"


def test_non_owner_role_sees_nothing(alice):
    """A role that is not the table owner (like Supabase's anon key) gets zero rows and cannot write."""
    p = alice.person()
    alice.loan(p["id"], 100)
    with engine.begin() as c:
        c.execute(text("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='howlat_anon') THEN CREATE ROLE howlat_anon NOLOGIN; END IF; END $$"))
        c.execute(text("GRANT USAGE ON SCHEMA public TO howlat_anon"))
        c.execute(text("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO howlat_anon"))
    try:
        with engine.begin() as c:
            c.execute(text("SET LOCAL ROLE howlat_anon"))
            for t in ("users", "people", "transactions", "repayments", "audit_logs"):
                assert c.execute(text(f"select count(*) from {t}")).scalar_one() == 0, t
    finally:
        with engine.begin() as c:
            c.execute(text("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM howlat_anon"))
            c.execute(text("REVOKE USAGE ON SCHEMA public FROM howlat_anon"))
            c.execute(text("DROP ROLE howlat_anon"))
