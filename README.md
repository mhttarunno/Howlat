<div align="center">

# HOWLAT
### *Every taka accounted for.*

<p align="center">
  <strong>A high-integrity private ledger for tracking money lent, money borrowed, and every repayment in between.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#accounting">Accounting</a> •
  <a href="#security">Security</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#api">API Reference</a> •
  <a href="#installation">Installation</a> •
  <a href="#testing">Testing</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production--Ready-10B981?style=for-the-badge&logo=statuspage&logoColor=white" alt="Status" />
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

---

<p align="center">
  <img src="assets/banner.svg" alt="HOWLAT Fintech Private Ledger Banner" width="100%" />
</p>

</div>

---

## Executive Overview

**Howlat** is a private, double-entry inspired personal money and debt ledger designed for individuals who routinely lend, borrow, and settle repayments across personal and professional relationships.

Most debt trackers fail by storing mutable balances directly in database columns, inevitably leading to synchronization bugs, race conditions, and ledger drift. **Howlat completely eliminates balance columns.** The database persists **only immutable original financial facts** (`LENT` loans, `BORROWED` loans, and individual `repayments`). Every balance, receivable, payable, and ledger status is computed dynamically on the server from raw atomic records.

- **No Float Arithmetic:** All monetary fields use PostgreSQL `NUMERIC(14,2)`, Python `Decimal`, and stringified JSON payloads.
- **Race-Condition Proof:** Concurrent repayments are governed by `SELECT ... FOR UPDATE` row locks.
- **Three-Layer Tenant Isolation:** Foreign key boundaries, user-filtered query scopes, and Row-Level Security (RLS).
- **Fintech UI/UX:** Frosted glassmorphism interface built with React 19, Tailwind CSS 4, and Radix UI primitives.

---

<div id="features"></div>

## Features Showcase

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🤝 Money Lending Tracker</h3>
      <p>Log money given to friends, family, or colleagues with explicit terms, expected return dates, and references. Automatically categorizes outstanding debt.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📥 Borrowing Tracker</h3>
      <p>Keep track of personal debts, borrowed capital, and liabilities. Clearly distinguishes money you owe from money owed to you at all times.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>⚡ Repayment Engine</h3>
      <p>Supports single full repayments or flexible micro-installments. Rejects overpayment at both application and database constraint levels.</p>
    </td>
    <td width="50%" valign="top">
      <h3>👥 People Management</h3>
      <p>Dedicated profile ledgers for each counterparty. View complete transaction histories, net positions, and contact records. Soft-archives without breaking history.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 Financial Dashboard</h3>
      <p>Instant clarity on Net Ledger Position, Total Receivables, Total Payables, and monthly cash flow metrics. Driven by unified aggregation services.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📜 Unified Transaction Feed</h3>
      <p>Searchable, paginated, and sortable unified feed of both original loans and subsequent repayments with debounce-powered search and multi-criteria filters.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📈 Reports & Analytics</h3>
      <p>Monthly and yearly repayment activity charts, lending vs. borrowing ratio breakdowns, and counterparty concentration analysis powered by Recharts.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📑 Multi-Format Data Exports</h3>
      <p>Export ledger statements into clean CSV, Excel (<code>.xlsx</code>), and formatted PDF documents. Sanitized against formula injection exploits.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🔔 Smart In-App Reminders</h3>
      <p>Automated reminders for overdue repayments and upcoming loan maturities. Zero external communication keeps your finances 100% private.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🛡️ Immutable Audit Logging</h3>
      <p>Append-only <code>audit_logs</code> table recording exact before/after JSONB snapshots for every create, update, delete, and archive operation.</p>
    </td>
  </tr>
</table>

---

<div id="tech-stack"></div>

## Technology Stack

<table width="100%">
  <thead>
    <tr style="border: none;">
      <th width="33%" align="center" style="background: rgba(37,99,235,0.08); border-radius: 8px; padding: 12px;">
        <img src="https://img.shields.io/badge/Frontend-Client_Layer-2563EB?style=for-the-badge&logo=react&logoColor=white" alt="Frontend" /><br />
        <sub><strong>Interactive Frosted Glass UI</strong></sub>
      </th>
      <th width="33%" align="center" style="background: rgba(16,185,129,0.08); border-radius: 8px; padding: 12px;">
        <img src="https://img.shields.io/badge/Backend-API_Engine-059669?style=for-the-badge&logo=fastapi&logoColor=white" alt="Backend" /><br />
        <sub><strong>High-Throughput Async Service</strong></sub>
      </th>
      <th width="33%" align="center" style="background: rgba(139,92,246,0.08); border-radius: 8px; padding: 12px;">
        <img src="https://img.shields.io/badge/Storage-Cloud_&_Infra-7C3AED?style=for-the-badge&logo=postgresql&logoColor=white" alt="Storage" /><br />
        <sub><strong>ACID Persistence & Managed Cloud</strong></sub>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top" style="padding: 14px;">
        <p><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /> <strong>React 19</strong><br /><sub>Concurrent single-page application presentation layer</sub></p>
        <p><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /> <strong>TypeScript 5.7</strong><br /><sub>Strict compile-time verification across the client</sub></p>
        <p><img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" /> <strong>Vite 6</strong><br /><sub>Instant Hot Module Replacement (HMR) and optimized rollup bundle</sub></p>
        <p><img src="https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind" /> <strong>Tailwind CSS 4</strong><br /><sub>Design token engine powering the frosted glass fintech UI</sub></p>
        <p><img src="https://img.shields.io/badge/Radix_UI-Primitives-161618?style=flat-square&logo=radixui&logoColor=white" alt="Radix" /> <strong>Radix UI</strong><br /><sub>Unstyled, fully accessible dialog, dropdown & alert primitives</sub></p>
        <p><img src="https://img.shields.io/badge/TanStack-Query_v5-FF4154?style=flat-square&logo=reactquery&logoColor=white" alt="TanStack" /> <strong>TanStack Query v5</strong><br /><sub>Server-state caching, invalidation & automatic background refetch</sub></p>
        <p><img src="https://img.shields.io/badge/Hook_Form-Zod-EC5990?style=flat-square&logo=reacthookform&logoColor=white" alt="Forms" /> <strong>Hook Form + Zod</strong><br /><sub>Schema-driven form validation and type inference</sub></p>
        <p><img src="https://img.shields.io/badge/Recharts-Analytics-22C55E?style=flat-square&logo=chartdotjs&logoColor=white" alt="Recharts" /> <strong>Recharts</strong><br /><sub>Responsive lending vs. borrowing activity charts</sub></p>
        <p><img src="https://img.shields.io/badge/date--fns-Format-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="date-fns" /> <strong>date-fns</strong><br /><sub>Deterministic date arithmetic and reminder scheduling</sub></p>
      </td>
      <td valign="top" style="padding: 14px;">
        <p><img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" /> <strong>Python 3.13</strong><br /><sub>Latest modern runtime with improved execution speed</sub></p>
        <p><img src="https://img.shields.io/badge/FastAPI-Async-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /> <strong>FastAPI</strong><br /><sub>High-performance asynchronous REST endpoints</sub></p>
        <p><img src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white" alt="SQLAlchemy" /> <strong>SQLAlchemy 2.0</strong><br /><sub>Modern 2.0 ORM with pessimistic <code>SELECT FOR UPDATE</code> locking</sub></p>
        <p><img src="https://img.shields.io/badge/Pydantic-v2-E92063?style=flat-square&logo=pydantic&logoColor=white" alt="Pydantic" /> <strong>Pydantic v2</strong><br /><sub>Rust-powered payload validation and data sterilization</sub></p>
        <p><img src="https://img.shields.io/badge/Alembic-Migrations-F59E0B?style=flat-square" alt="Alembic" /> <strong>Alembic</strong><br /><sub>Strict, reproducible schema migration revisions</sub></p>
        <p><img src="https://img.shields.io/badge/Argon2id-Security-0284C7?style=flat-square" alt="Argon2id" /> <strong>Argon2id</strong><br /><sub>Memory-hard password hashing resistant to GPU cracking</sub></p>
        <p><img src="https://img.shields.io/badge/PyJWT-HS256-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" /> <strong>PyJWT (HS256)</strong><br /><sub>Stateless tokens with instant database <code>token_version</code> revocation</sub></p>
        <p><img src="https://img.shields.io/badge/Decimal-Fixed--Point-10B981?style=flat-square" alt="Decimal" /> <strong>Python Decimal</strong><br /><sub>Exact precision math; zero floating-point arithmetic errors</sub></p>
      </td>
      <td valign="top" style="padding: 14px;">
        <p><img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /> <strong>PostgreSQL 16</strong><br /><sub>ACID relational engine with <code>NUMERIC(14,2)</code> financial columns</sub></p>
        <p><img src="https://img.shields.io/badge/Supabase-Managed_DB-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /> <strong>Supabase</strong><br /><sub>Cloud database tier with built-in connection session pooler</sub></p>
        <p><img src="https://img.shields.io/badge/Render-Web_Service-46E3B7?style=flat-square&logo=render&logoColor=black" alt="Render" /> <strong>Render</strong><br /><sub>Containerized FastAPI backend hosting with pre-deploy migrations</sub></p>
        <p><img src="https://img.shields.io/badge/Vercel-Edge_CDN-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" /> <strong>Vercel</strong><br /><sub>Global edge network hosting the static Vite React SPA</sub></p>
        <p><img src="https://img.shields.io/badge/RLS-Enabled-EF4444?style=flat-square" alt="RLS" /> <strong>Row-Level Security</strong><br /><sub>PostgreSQL engine-level isolation blocking unauthorized access</sub></p>
        <p><img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /> <strong>Docker Ready</strong><br /><sub>Containerized reproducible production environment</sub></p>
      </td>
    </tr>
  </tbody>
</table>

### Numerical Precision Standard
> [!IMPORTANT]
> **Floating-point types (`float`, `DOUBLE PRECISION`, JavaScript `Number`) are strictly forbidden in Howlat's financial flow.**
> - **Database:** `NUMERIC(14, 2)` ensures exact fixed-point persistence up to 999,999,999,999.99.
> - **Backend Engine:** Python `decimal.Decimal` with explicit `ROUND_HALF_UP` quantization.
> - **Network JSON:** Serialized as decimal strings (e.g., `"1565.00"`).
> - **Frontend Rendering:** Formatted through dedicated integer/decimal string utility parsers.

---

<div id="architecture"></div>

## System Architecture

Howlat enforces a strict separation of concerns. The React frontend is a pure presentation layer that never calculates or dictates authoritative financial figures. The FastAPI backend orchestrates all business logic, while PostgreSQL guarantees structural and relational integrity.

```mermaid
flowchart TD
  subgraph Client ["Client Tier (Browser / PWA)"]
    UI["React 19 Frontend (Vite + Tailwind v4)"]
    RQ["TanStack Query (Cache & Synchronizer)"]
    RHF["React Hook Form + Zod Validation"]
    UI --> RHF
    RHF --> RQ
  end

  subgraph API ["Application Tier (FastAPI Async)"]
    GW["FastAPI Router /api/v1"]
    AUTH_MW["JWT & Token Version Verification"]
    
    subgraph Services ["Authoritative Service Layer"]
      AUTH_S["Auth Service\n(Argon2id + PyJWT)"]
      LEDGER_S["Ledger Service\n(Pessimistic Locking & Validation)"]
      BAL_S["Balance Calculation Engine\n(Authoritative State Derivation)"]
      FLOW_S["Flow & Aggregation Service"]
      REP_S["Reporting & Analytics Engine"]
      EXP_S["Export Service\n(CSV, XLSX, PDF)"]
      AUD_S["Audit Trail Service\n(Append-Only JSONB)"]
      NOTIF_S["Notification Engine\n(Overdue & Upcoming)"]
    end
  end

  subgraph Database ["Data Tier (PostgreSQL 16 / Supabase)"]
    USERS[("users")]
    PEOPLE[("people")]
    TX[("transactions (LENT / BORROWED)")]
    REPAY[("repayments")]
    AUDIT[("audit_logs")]
    RLS["Row Level Security (Locked)"]
  end

  RQ -- "HTTPS + Bearer JWT + Idempotency-Key" --> GW
  GW --> AUTH_MW
  AUTH_MW --> AUTH_S
  AUTH_MW --> LEDGER_S
  AUTH_MW --> BAL_S

  LEDGER_S -- "SELECT FOR UPDATE" --> TX
  LEDGER_S --> REPAY
  LEDGER_S -- "Atomic Write" --> AUDIT
  BAL_S -- "Read Facts" --> TX
  BAL_S -- "Read Facts" --> REPAY
  FLOW_S --> BAL_S
  REP_S --> BAL_S
  EXP_S --> REP_S

  AUDIT --- RLS
```

### Request Lifecycle
1. **Transport & Idempotency:** Mutations send an `Idempotency-Key` header generated on the client.
2. **Authentication:** The Bearer JWT is validated; expired tokens or tokens with outdated `token_version` are immediately rejected with `401 Unauthorized`.
3. **Tenant Scoping:** The `user_id` is extracted strictly from the token payload and injected into database queries. Client-provided user IDs are discarded.
4. **Execution & Locking:** If a repayment or loan alteration is requested, the service layer acquires a row-level lock (`SELECT ... FOR UPDATE`) on the loan.
5. **Audit Logging:** Every mutating transaction writes an append-only JSONB snapshot to `audit_logs` within the identical database transaction boundary.

---

<div id="accounting"></div>

## Financial Accounting Architecture

Howlat implements a pure dynamic balance derivation architecture. No balances are cached, persisted, or incrementally adjusted in table columns.

```mermaid
flowchart LR
  subgraph InputRecords ["1. Immutable Facts"]
    Loan["Loan Record\n(Type: LENT / BORROWED)\nStatus: Fixed Amount"]
    Repay1["Repayment Record #1\n(Active Amount)"]
    Repay2["Repayment Record #2\n(Active Amount)"]
  end

  subgraph CalcEngine ["2. Balance Service (Authoritative)"]
    Engine["Dynamic Calculation Layer\nFormula: Loan - SUM(Repayments)"]
  end

  subgraph Derivations ["3. Derived Financial Entities"]
    Out["Outstanding Loan Balance"]
    Rec["Overall Receivable (LENT)"]
    Pay["Overall Payable (BORROWED)"]
    Net["Net Position (Rec - Pay)"]
    Stat["Computed Status\n(UNPAID | PARTIALLY_PAID | FULLY_PAID)"]
  end

  Loan --> Engine
  Repay1 --> Engine
  Repay2 --> Engine
  Engine --> Out
  Out --> Stat
  Out --> Rec
  Out --> Pay
  Rec --> Net
  Pay --> Net
```

### Core Accounting Formulas

$$\text{Outstanding}(\text{loan}) = \text{loan}.\text{amount} - \sum_{\text{active}} \text{repayments}(\text{loan})$$

$$\text{Total Receivable} = \sum_{\text{loan} \in \text{LENT}} \text{Outstanding}(\text{loan})$$

$$\text{Total Payable} = \sum_{\text{loan} \in \text{BORROWED}} \text{Outstanding}(\text{loan})$$

$$\text{Net Ledger Position} = \text{Total Receivable} - \text{Total Payable}$$

### Loan Lifecycle States
- `UNPAID`: $\sum \text{repayments} = 0$. The full initial principal is outstanding.
- `PARTIALLY_PAID`: $0 < \sum \text{repayments} < \text{loan}.\text{amount}$.
- `FULLY_PAID`: $\sum \text{repayments} = \text{loan}.\text{amount}$. Outstanding balance is exactly zero.

> [!TIP]
> **Why this matters:** If a past repayment is edited or soft-deleted, every derived figure across the dashboard, reports, counterparty balances, and exports updates automatically and instantaneously with zero synchronization lag.

---

<div id="security"></div>

## Security & Data Integrity

### Data Integrity Guarantees

| Concern | Implementation Mechanism | System Guarantee |
| :--- | :--- | :--- |
| **Negative / Zero Values** | Checked in Pydantic models and PostgreSQL `CHECK (amount > 0)`. | Database rejects any monetary figure $\le 0.00$. |
| **Overpayment** | Service layer re-calculates outstanding balance under lock. | Returns `422 Unprocessable Entity`; fully settled loans return `409 Conflict`. |
| **Race Conditions** | Row-level locking via `SELECT ... FOR UPDATE` on loan row. | Concurrent repayment attempts serialize cleanly; overpayment is blocked. |
| **Duplicate Requests** | Client generates UUID `Idempotency-Key` sent via header. | Replays return cached response; partial unique index blocks duplicate writes. |
| **Historical Distortion** | Verification check before loan modification. | Loan principal cannot be lowered below the sum already repaid. |
| **Date Ordering** | Validation rule on expected repayment dates. | Repayment dates cannot precede original loan inception dates. |
| **Data Destruction** | Soft-deletion architecture (`deleted_at` timestamp). | Deleted items are omitted from math but preserved for compliance and audit. |
| **Audit Compliance** | Append-only `audit_logs` table storing before/after states. | Triggered atomically inside the same DB transaction as the business operation. |
| **Relational Integrity** | Composite foreign keys `(user_id, person_id)`. | Impossible for User A's transaction to reference User B's contact at DB level. |

### Security Architecture & Authorization Flow

User identity within Howlat is **derived exclusively from the verified JWT bearer token**. Client payloads are never trusted to specify or influence the active `user_id`.

```mermaid
flowchart TD
  subgraph Client ["Client Request"]
    Req["Incoming HTTP Request\n(Bearer JWT + Idempotency-Key)"]
  end

  subgraph AuthValidation ["1. Authentication & Session Verification"]
    TokenCheck{"JWT Signature &\nExpiration Valid?"}
    VersionCheck{"token_version matches\nDatabase Record?"}
    Reject401["401 Unauthorized\n(Invalid, Expired or Tampered Token)"]
    Revoke401["401 Unauthorized\n(Session Revoked via token_version)"]
  end

  subgraph TenantIsolation ["2. Three-Layer Tenant Scoping"]
    UserExtract["Extract user_id Exclusively\nfrom Cryptographic Token Claims"]
    QueryScope["Scope ORM Query:\nWHERE user_id = token.user_id"]
    LockRow["Acquire Pessimistic Lock:\nSELECT FOR UPDATE"]
    NotFound404["404 Not Found\n(Cross-tenant record access rejected)"]
  end

  subgraph BusinessExecution ["3. Validation & Atomic Commit"]
    IntegrityCheck{"Amount within Outstanding\nBalance & Constraints Valid?"}
    Reject422["422 Unprocessable Entity\n(Overpayment or Malformed Input)"]
    AtomicCommit["Atomic DB Commit:\nWrite Record + Append audit_logs"]
    SuccessRes["200 / 201 Response\n(Computed Ledger Figures)"]
  end

  Req --> TokenCheck
  TokenCheck -- "No" --> Reject401
  TokenCheck -- "Yes" --> VersionCheck
  VersionCheck -- "No (Revoked)" --> Revoke401
  VersionCheck -- "Yes (Active)" --> UserExtract

  UserExtract --> QueryScope
  QueryScope --> LockRow
  LockRow -- "No Match / Foreign ID" --> NotFound404
  LockRow -- "Record Owned by User" --> IntegrityCheck

  IntegrityCheck -- "No" --> Reject422
  IntegrityCheck -- "Yes" --> AtomicCommit
  AtomicCommit --> SuccessRes
```

### Defense-in-Depth Security Matrix

1. **Argon2id Password Hashing:** User passwords are encrypted with Argon2id—a memory-hard hashing algorithm resistant to GPU, FPGA, and ASIC-driven brute-force attacks.
2. **Cryptographic JWT (HS256) Identity:** Authentication utilizes HMAC-SHA256 signed JSON Web Tokens. The `user_id` is extracted strictly from the validated token claims by FastAPI dependencies (`get_current_user`). Request payloads or path parameters can never override caller identity.
3. **Instant Session Invalidation (`token_version`):** Explicit logouts and password changes atomically increment an integer `token_version` in the database. Incoming requests compare the token's claim against the database, immediately revoking all previously issued tokens across all devices.
4. **Brute-Force Login Throttling:** Login attempts are rate-limited to 10 failures per 15 minutes per email address. The API returns an identical generic error message (`Invalid email or password`) regardless of whether the email exists or the password was incorrect, preventing account enumeration.
5. **Three-Layer Tenant Isolation:**
   - **Layer 1 (Query Filtering):** Every database query automatically binds `WHERE user_id = current_user.id`.
   - **Layer 2 (Zero-Leak 404s):** Requests referencing another user's person or transaction ID receive a `404 Not Found` rather than `403 Forbidden`, concealing resource existence.
   - **Layer 3 (Composite Foreign Keys):** Database foreign keys enforce `(user_id, person_id)` and `(user_id, transaction_id)`, making it structurally impossible at the PostgreSQL engine level for User A's transactions to link to User B's records.
6. **PostgreSQL Row-Level Security (RLS):** Supabase RLS is enabled across all tables with zero public access policies. Anonymous keys and client-side Supabase REST APIs cannot access or query table rows. The backend connects directly as the table owner.
7. **Strict CORS Policy:** Cross-Origin Resource Sharing is locked down to explicitly configured domains in `CORS_ORIGINS`.
8. **Pydantic v2 Schema Sanitization:** All incoming JSON payloads undergo strict type coercion, string trimming, and constraint validation before entering service logic.
9. **SQL Injection Defense:** All database access is compiled through SQLAlchemy 2.0 parameterized queries. Search inputs escape wildcard characters (`%` and `_`).
10. **Formula Injection Neutralization:** CSV and Excel export generators sanitize spreadsheet cells beginning with `=`, `+`, `-`, or `@` by prepending a literal single quote (`'`), neutralizing CSV/formula injection attacks.
11. **Production Documentation Cloaking:** When running in production (`APP_ENV=production`), interactive Swagger (`/docs`), OpenAPI schemas (`/openapi.json`), and ReDoc (`/redoc`) are entirely disabled.

---

<div id="project-structure"></div>

## Project Structure

```
Howlat/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/                  # Thin FastAPI router endpoints
│   │   │       ├── auth.py          # Authentication & user profile endpoints
│   │   │       ├── dashboard.py     # Summary cards, charts & notifications
│   │   │       ├── people.py        # Counterparty management & person ledgers
│   │   │       ├── repayments.py    # Repayment recording & reversal
│   │   │       ├── reports.py       # Breakdown aggregations & file exports
│   │   │       └── transactions.py  # Unified loan & repayment feed
│   │   ├── core/                    # Security, JWT, config & exception handlers
│   │   ├── db/                      # SQLAlchemy engine, session maker & base model
│   │   ├── models/                  # Declarative SQLAlchemy models
│   │   ├── schemas/                 # Pydantic request & response schemas
│   │   ├── services/                # Authoritative financial business logic
│   │   │   ├── audit.py             # Append-only audit logger
│   │   │   ├── auth.py              # Password hashing & JWT generation
│   │   │   ├── balances.py          # Dynamic balance & status derivation engine
│   │   │   ├── dashboard.py         # Summary metrics & chart data assemblers
│   │   │   ├── entries.py           # Unified transaction feed builder
│   │   │   ├── exporter.py          # CSV, XLSX and PDF formatting
│   │   │   ├── flows.py             # Period cash flow calculations
│   │   │   ├── ledger.py            # Pessimistic locking & repayment validation
│   │   │   ├── notifications.py     # Overdue and upcoming reminder evaluations
│   │   │   ├── people.py            # Counterparty balance reconciler
│   │   │   └── reports.py           # Monthly, yearly & counterparty reports
│   │   └── main.py                  # FastAPI application factory & middleware
│   ├── migrations/                  # Alembic database migration revisions
│   │   └── versions/                # 0001 (Schema) and 0002 (RLS enablement)
│   ├── tests/                       # Pytest test suite (Real PostgreSQL tests)
│   ├── alembic.ini                  # Alembic environment configuration
│   └── requirements.txt             # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/              # Modular UI components
│   │   │   ├── forms/               # Modal dialog forms (Loan, Repayment, Person)
│   │   │   ├── ui/                  # Frosted glass primitives (Button, Dialog, Card)
│   │   │   ├── charts.tsx           # Recharts visual analytics components
│   │   │   └── shared.tsx           # Badges, avatars, monetary formatters
│   │   ├── context/                 # React contexts (Auth, Actions, Theme)
│   │   ├── layouts/                 # AppLayout with sidebar, topbar & bottom sheet
│   │   ├── pages/                   # Application views (Dashboard, People, Reports)
│   │   ├── services/                # Axios API client & TanStack Query hooks
│   │   ├── test/                    # Vitest end-to-end integration test suite
│   │   ├── utils/                   # Financial formatters, dates & Zod schemas
│   │   ├── index.css                # Tailwind CSS 4 & Frosted Glass tokens
│   │   └── main.tsx                 # Client application entry point
│   ├── index.html                   # HTML document root with theme init script
│   ├── package.json                 # Node dependencies & build scripts
│   └── vite.config.ts               # Vite configuration with API proxying
├── .gitignore                       # Repository ignore rules
├── README.md                        # Documentation showcase
└── render.yaml                      # Render Blueprint deployment definition
```

---

<div id="api"></div>

## API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Endpoints Overview

<table>
  <thead>
    <tr>
      <th>Module</th>
      <th>Method</th>
      <th>Endpoint</th>
      <th>Description</th>
      <th>Access</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="4"><strong>Auth</strong></td>
      <td><code>POST</code></td>
      <td><code>/api/v1/auth/register</code></td>
      <td>Register a new user account with email and password</td>
      <td>Public</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/v1/auth/login</code></td>
      <td>Authenticate credentials; returns Bearer JWT</td>
      <td>Public</td>
    </tr>
    <tr>
      <td><code>GET</code> / <code>PATCH</code></td>
      <td><code>/api/v1/auth/me</code></td>
      <td>Retrieve or update active user profile</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/v1/auth/logout</code></td>
      <td>Invalidate user session by bumping token version</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td rowspan="3"><strong>People</strong></td>
      <td><code>GET</code> / <code>POST</code></td>
      <td><code>/api/v1/people</code></td>
      <td>List counterparties with computed balances or create one</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>GET</code> / <code>PATCH</code></td>
      <td><code>/api/v1/people/{id}</code></td>
      <td>Get detailed person ledger statement or update profile</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>DELETE</code></td>
      <td><code>/api/v1/people/{id}</code></td>
      <td>Soft-archive counterparty (preserves history)</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td rowspan="3"><strong>Transactions</strong></td>
      <td><code>GET</code></td>
      <td><code>/api/v1/transactions</code></td>
      <td>Unified paginated feed (loans & repayments) with filters</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>POST</code></td>
      <td><code>/api/v1/transactions</code></td>
      <td>Create new loan (<code>LENT</code> or <code>BORROWED</code>)</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>GET</code> / <code>PATCH</code> / <code>DELETE</code></td>
      <td><code>/api/v1/transactions/{id}</code></td>
      <td>Inspect, edit, or soft-delete a loan record</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td rowspan="2"><strong>Repayments</strong></td>
      <td><code>POST</code></td>
      <td><code>/api/v1/repayments</code></td>
      <td>Record partial or full repayment with <code>Idempotency-Key</code></td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>GET</code> / <code>PATCH</code> / <code>DELETE</code></td>
      <td><code>/api/v1/repayments/{id}</code></td>
      <td>Inspect, revise, or soft-delete an existing repayment</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td rowspan="2"><strong>Dashboard</strong></td>
      <td><code>GET</code></td>
      <td><code>/api/v1/dashboard/summary</code></td>
      <td>Retrieve headline metrics (Net, Receivable, Payable)</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/v1/dashboard/charts</code></td>
      <td>12-month lent vs. borrowed and repayment trends</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td rowspan="2"><strong>Reports & Export</strong></td>
      <td><code>GET</code></td>
      <td><code>/api/v1/reports/summary</code></td>
      <td>Comprehensive monthly and annual flow reports</td>
      <td>Authenticated</td>
    </tr>
    <tr>
      <td><code>GET</code></td>
      <td><code>/api/v1/reports/export</code></td>
      <td>Stream sanitized ledger exports (<code>csv</code>, <code>xlsx</code>, <code>pdf</code>)</td>
      <td>Authenticated</td>
    </tr>
  </tbody>
</table>

<details>
<summary><strong>View Standard Error Response Structure</strong></summary>

```json
{
  "detail": "Repayment amount (500.00) exceeds outstanding balance (350.00)",
  "code": "OVERPAYMENT_NOT_ALLOWED",
  "errors": [
    {
      "field": "amount",
      "message": "Maximum payable amount is 350.00"
    }
  ]
}
```
</details>

---

<div id="installation"></div>

## Installation & Local Development

### Quick Start with Docker (Recommended)
Run the full stack (PostgreSQL 16, FastAPI with automatic Alembic migrations, and Nginx-served React frontend) without installing Python, Node.js, or PostgreSQL locally:

```bash
# Build and start all services
docker compose up --build

# Or run in the background
docker compose up --build -d
```

- **App:** `http://localhost:5173`
- **API & Swagger Docs:** `http://localhost:8000/docs`
- **Stop & clean up:** `docker compose down` (add `-v` to reset the database volume)

You can optionally copy `.env.example` to `.env` at the repository root to customize ports, `JWT_SECRET`, or `APP_ENV`.

#### Running Tests via Docker
```bash
# Backend Pytest suite (spins up an ephemeral PostgreSQL test database)
docker compose --profile test run --rm backend-test

# Frontend TypeScript check & Vitest suite
docker compose --profile test run --rm frontend-test
```

---

### Manual Local Setup

#### Prerequisites
- **Python:** `v3.13+`
- **Node.js:** `v22+` (with npm)
- **PostgreSQL:** `v16+` (or a remote Supabase instance)

### 1. Database Provisioning
Create local databases for development and testing:
```bash
createdb howlat_dev
createdb howlat_test
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Generate a cryptographically secure 48-byte URL-safe JWT secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Edit `.env` and assign your database URL and generated secret:
```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/howlat_dev
JWT_SECRET=your_generated_secret_string_here
APP_ENV=development
CORS_ORIGINS=["http://localhost:5173"]
```

Run schema migrations:
```bash
alembic upgrade head
```

Start the FastAPI application with auto-reload:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API interactive documentation will be accessible at: `http://localhost:8000/docs`

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The application will be live at `http://localhost:5173` (Vite proxies all `/api` requests to port `8000`).

---

<div id="testing"></div>

## Testing & Quality Assurance

Howlat's backend test suite does not use mock database stubs or sqlite compromises. **It executes against a real PostgreSQL engine utilizing actual Alembic migrations**, verifying constraints, concurrency locks, and cross-user isolation.

```bash
# -------------------------------------------------------------
# Backend Automated Pytest Suite
# (Refuses to execute if database name does not contain "test")
# -------------------------------------------------------------
cd backend
TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/howlat_test pytest -v

# -------------------------------------------------------------
# Frontend Unit & Integration Tests (Vitest)
# -------------------------------------------------------------
cd frontend
npm test

# -------------------------------------------------------------
# Frontend Typecheck & Production Bundle Build
# -------------------------------------------------------------
npm run typecheck
npm run build
```

### Verified Test Capabilities
- **Authentication & Security:** Registration, Argon2 verification, token expiration, version revocation, rate limiting.
- **Relational Isolation:** Verification that foreign records return 404 and composite foreign keys reject cross-tenant references.
- **Concurrency & Locking:** Tested with 8 simultaneous threads attempting overpayment on identical loan rows.
- **Accounting Verification:** Zero-balance resolution, multi-installment calculations, and date ordering.
- **Export Sanitization:** Automated formula injection neutralizing verification in CSV/XLSX generation.

---

<div id="deployment"></div>

## Deployment Architecture

Howlat is engineered to deploy across modern, zero-maintenance cloud infrastructure.

```mermaid
flowchart LR
  subgraph Vercel ["Frontend Hosting (Vercel)"]
    V_SPA["React 19 SPA\n(Vite Build Artifacts)"]
    V_CFG["vercel.json\n(SPA Rewrites & Security Headers)"]
  end

  subgraph Render ["Backend API (Render)"]
    R_API["FastAPI Web Service\n(Docker / Python 3.13)"]
    R_MIG["Startup Hook:\nalembic upgrade head"]
  end

  subgraph Supabase ["Data Tier (Supabase)"]
    S_DB[("PostgreSQL 16 Instance\n(Session Pooler Port 5432)")]
    S_RLS["Row Level Security\n(Locked Tables)"]
  end

  ClientBrowser["End User Browser"] -->|HTTPS| V_SPA
  V_SPA -->|HTTPS /api/v1| R_API
  R_API -->|Encrypted SSL Pool| S_DB
  S_DB --- S_RLS
```

### Platform Instructions

#### 1. Database (Supabase)
1. Create a PostgreSQL project on [Supabase](https://supabase.com).
2. Navigate to **Project Settings → Database** and copy the URI connection string.
3. *Important:* On IPv4-only cloud hosts like Render's free tier, use the **Session pooler** connection string (port `5432`).

#### 2. Backend (Render)
A deployment blueprint `render.yaml` is included at the root of the repository:
1. In Render, select **New → Blueprint** and link your repository.
2. Provide the following environment variables:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://howlat.vercel.app`, no trailing slash).
   - `JWT_SECRET`: Leave blank for Render to generate automatically, or provide your own.
3. Migrations execute automatically upon startup via `startCommand: alembic upgrade head && uvicorn ...`.
4. *Optional:* Set `ALLOW_REGISTRATION=false` once your account is created to make the instance private.

> [!NOTE]
> Render free-tier instances sleep after 15 minutes of inactivity. The initial wake-up request may take ~30 seconds. Howlat's frontend includes explicit retry and connectivity handling, displaying a clear retry state rather than misleading zero balances.

#### 3. Frontend (Vercel)
1. Create a **New Project** in [Vercel](https://vercel.com) and import the repository.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Define the Environment Variable:
   - `VITE_API_URL`: `https://your-render-service.onrender.com`
5. Deploy. `vercel.json` will automatically configure client-side SPA routing and security headers.

---

<div id="limitations"></div>

## Known Limitations

<details>
<summary><strong>Click to view known architectural boundaries</strong></summary>

<br />

1. **In-Memory Login Rate Limiting:** The default login rate limiter is stored in process memory. If deploying multiple horizontal backend instances behind a round-robin load balancer, configure a shared Redis store or ingress proxy rate limiting.
2. **Email-Less Password Recovery:** Howlat does not include SMTP or email delivery services by design. Forgotten passwords cannot be reset via email; users can change their password while authenticated.
3. **PDF Non-Latin Font Rendering:** PDF generation relies on ReportLab with `DejaVu Sans`. If deploying in an environment without `fonts-dejavu-core` installed, non-Latin scripts (e.g. Bangla script) in counterparty names may fall back to placeholder glyphs. CSV and Excel exports are completely unaffected.
4. **In-App-Only Reminders:** Reminders for overdue repayments exist strictly in the internal application UI and notification dropdown; Howlat never sends unsolicited emails, SMS, or messages to third parties.
5. **Audit Trail UI:** While every database alteration is permanently recorded in the `audit_logs` table with full JSONB before/after values, there is no separate management UI to browse raw audit entries in-app. Audit dumps are exported via **Settings → Export Data**.

</details>

---

## License

This project is distributed under the **MIT License**. Feel free to use, customize, and self-host for personal or commercial ledger management.

<div align="center">
  <sub>Built with precision for flawless financial bookkeeping.</sub>
</div>
