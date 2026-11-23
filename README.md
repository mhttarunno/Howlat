# Howlat — Personal Money & Debt Tracker

A private ledger for money you **lend**, money you **borrow**, and every **repayment** in between.
*Every taka accounted for.*

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS 4, Radix UI primitives, React Router, TanStack Query, React Hook Form + Zod, Recharts, date-fns
- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2, Pydantic v2, Alembic, PostgreSQL 16 (Supabase), Argon2 + JWT
- **Money:** `NUMERIC(14,2)` in Postgres, `Decimal` in Python, **decimal strings** in JSON. No floats anywhere in the money path.

## How the accounting works

The database stores only **original facts**: loans (`transactions`, type `LENT` or `BORROWED`) and individual `repayments`.
Nothing derived is stored. Every balance is computed on the server from those rows:

```
outstanding(loan)     = loan.amount − Σ active repayments of that loan
receivable (overall)  = Σ outstanding over LENT loans
payable    (overall)  = Σ outstanding over BORROWED loans
net position          = receivable − payable
status: UNPAID (nothing repaid) · PARTIALLY_PAID · FULLY_PAID (outstanding = 0)
```

All of this lives in `backend/app/services/balances.py` and `flows.py`; the dashboard, people, reports and exports all call the same functions, so figures cannot drift apart. The frontend never sends or computes an authoritative balance.

### Integrity guarantees

| Concern | How it is handled |
|---|---|
| Overpayment / zero / negative | Validated in the service layer **and** by DB `CHECK (amount > 0)`; overpayment returns 422, a fully paid loan returns 409 |
| Concurrent repayments | `SELECT … FOR UPDATE` on the loan row, then re-read the repaid total. Tested with 8 simultaneous requests |
| Duplicate submissions | `Idempotency-Key` header (unique per user, partial unique index); the UI sends one per form |
| Editing history | Loan amount cannot drop below what is already repaid; repayment dates cannot precede the loan |
| Deleting | **Soft delete** (`deleted_at`). Deleted rows disappear from every calculation but remain in the database |
| Audit trail | `audit_logs` (append-only JSONB before/after) written in the same DB transaction as every create/update/delete/archive |
| People | Archived, never hard-deleted; history is preserved |
| Atomicity | Each operation is one DB transaction; any failure rolls everything back |

### Security

- Passwords hashed with **Argon2id**; login throttling (10 failures / 15 min per email); identical error for unknown email vs wrong password.
- **JWT** (HS256) with signature + expiry validation; `user_id` is *only* ever taken from the verified token. Logout and password change bump `token_version`, instantly invalidating all older tokens.
- **Per-user isolation, three layers:** every query filters by the token's user; foreign records answer **404** (existence is not revealed); and **composite foreign keys** `(user_id, person_id)` / `(user_id, transaction_id)` make it impossible at the database level to link one user's rows to another's.
- **Row Level Security** is enabled on every table with no policies (migration `0002`), so Supabase's auto-generated REST API and anon key can read nothing. The backend connects as the table owner and is unaffected.
- CORS restricted to `CORS_ORIGINS`; Swagger docs disabled when `APP_ENV=production`; request bodies validated by Pydantic; SQLAlchemy parameterized queries; LIKE wildcards in search are escaped; CSV/Excel exports neutralize formula injection (`=`, `+`, `-`, `@`); error handlers never log request bodies.

## Run locally

Prerequisites: Python 3.13, Node 22, PostgreSQL 16 (or a Supabase project).

```bash
# 1. Database
createdb howlat_dev

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit DATABASE_URL and JWT_SECRET
alembic upgrade head
uvicorn app.main:app --reload   # http://localhost:8000/docs

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (Vite proxies /api to :8000)
```

Generate a JWT secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`

## Tests

```bash
# Backend: needs a Postgres database whose name contains "test" (the suite refuses to run otherwise)
createdb howlat_test
cd backend && TEST_DATABASE_URL=postgresql://postgres@localhost:5432/howlat_test pytest -q

# Frontend
cd frontend && npm test          # vitest
npm run build                    # typecheck + production bundle
```

The backend suite builds the schema from the **real Alembic migrations** and exercises the real database, including concurrent requests across threads.
It covers auth, people CRUD, lending, borrowing, partial and full repayments, overpayment/zero/negative rejection, balance maths, editing and deleting, audit rows, idempotency, cross-user isolation (API and DB level), RLS, dashboard, reports and exports, and the full acceptance workflow from the brief.

## Deploy

**Database (Supabase)** — create a project, copy the connection string from *Project Settings → Database* (use the *Session pooler* string on IPv4-only hosts such as Render's free tier).

**Backend (Render)** — `render.yaml` is included.
1. New → Blueprint → select this repo.
2. Set `DATABASE_URL` (the Supabase string) and `CORS_ORIGINS` (your Vercel URL, no trailing slash). `JWT_SECRET` is generated for you.
3. Migrations run automatically on each deploy (`preDeployCommand: alembic upgrade head`).
4. After creating your own account, optionally set `ALLOW_REGISTRATION=false` to close sign-ups.

**Frontend (Vercel)**
1. New Project → set **Root Directory** to `frontend`. Framework preset: Vite.
2. Environment variable: `VITE_API_URL=https://<your-render-service>.onrender.com`
3. `vercel.json` already handles SPA routing and security headers.

Never put the database password, Supabase service-role key or JWT secret in the frontend or in git.
Render's free tier sleeps when idle, so the first request after a pause can take ~30 s; the UI shows a retryable error rather than fake data if the API is unreachable.

## Project layout

```
backend/app/
  api/v1/        thin route handlers (auth, people, transactions, repayments, dashboard, reports)
  services/      ALL business logic: balances, ledger (locking/validation), entries (unified feed),
                 people, flows (period aggregation), reports, exporter, notifications, audit, auth
  models/        SQLAlchemy models        schemas/   Pydantic request/response models
  core/          config, security, errors db/        engine + session
backend/migrations/   Alembic (0001 schema, 0002 RLS)
backend/tests/        pytest
frontend/src/
  pages/ layouts/ components/ (ui primitives, forms, charts) context/ services/ (api + queries) utils/ test/
```

## API

Interactive docs at `/docs` in development. Highlights (all under `/api/v1`, bearer token required except register/login):

| | |
|---|---|
| Auth | `POST /auth/register · /login · /logout`, `GET/PATCH /auth/me`, `POST /auth/change-password · /delete-account`, `GET /auth/export` |
| People | `POST/GET /people`, `GET/PATCH/DELETE (archive) /people/{id}`, `POST /people/{id}/restore` |
| Transactions | `POST/GET /transactions` (unified loans + repayments feed: search, type, status, person, date range, overdue, open, sort, pagination), `GET/PATCH/DELETE /transactions/{id}` |
| Repayments | `POST/GET /repayments`, `GET/PATCH/DELETE /repayments/{id}` |
| Dashboard | `GET /dashboard/summary · /recent-activity · /charts`, `GET /notifications` |
| Reports | `GET /reports/summary · /monthly · /yearly · /people`, `GET /reports/export?report=…&format=csv\|xlsx\|pdf` |

Errors are JSON: `{"detail": "...", "code": "...", "errors": [{"field", "message"}]}`.

## Known limitations

- Login throttling is in-memory (per process). Behind multiple instances, add a shared limiter (e.g. Redis or a proxy rule).
- There is no email delivery, so **password reset by email is not implemented**; users can change their password while signed in. Add an email provider if you need forgot-password.
- PDF export uses DejaVu Sans when present on the server; without it, non-Latin names (e.g. Bangla) may not render in PDFs. CSV and Excel are unaffected. On Render, add a build step that installs `fonts-dejavu-core`, or bundle a TTF.
- Reminders are in-app only by design; nothing is ever sent to other people.
- Row edits are audited, but there is no in-app screen for browsing the audit log (it is included in *Settings → Export data*).
