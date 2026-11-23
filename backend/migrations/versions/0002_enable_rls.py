"""Enable Row Level Security on every table (deny-by-default).

Supabase exposes the `public` schema through its auto-generated REST API (PostgREST) using the
public anon key. Howlat has its own API and never uses that path, so RLS is switched on with NO
policies: the anon/authenticated roles can read and write nothing. The FastAPI backend connects as
the table owner (the `postgres` role), which bypasses RLS, so the application is unaffected.
Per-user isolation inside the app is enforced by the API (user_id from the verified JWT) and by
composite foreign keys; RLS is the extra wall that keeps the REST API closed.

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TABLES = ("users", "people", "transactions", "repayments", "audit_logs")


def upgrade() -> None:
    for t in TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
    # alembic_version holds no user data but lives in `public`; close it too.
    op.execute("ALTER TABLE alembic_version ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.execute("ALTER TABLE alembic_version DISABLE ROW LEVEL SECURITY")
    for t in reversed(TABLES):
        op.execute(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY")
