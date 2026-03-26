# Redesign Implementation Plan

## Executive Summary

This document outlines the implementation plan for redesigning Jiceot from its current bill/expense tracking model to a wallet-centric financial management system. The redesign introduces **Wallets** as the core entity (replacing Bill Types), adds **expense type hierarchy** with periodic/flexible recurrence and a `next_due_day` field for custom postponement, **migrates from SQLite to PostgreSQL**, **removes the reminder feature**, and does a **full frontend rewrite** in a new `client/` directory.

**Overall Recommendation: Server — rewrite expenses package, refactor infra. Client — full rewrite in `client/`. Remove `ios/` app.**

No data migration from the old schema is needed — this is a clean-slate deployment on PostgreSQL.

---

## 1. Current vs Redesigned Data Model

### Current Entities
| Entity | Purpose | Redesign Fate |
|---|---|---|
| BillType | Defines a recurring bill with cycle/day/amount | → **Wallet** |
| BillPayment | A payment made for a BillType in a specific year/month | → **Payment** |
| ExpenseType | Flat category for expenses | → **ExpenseType** (expanded) |
| ExpenseItem | Individual expense, optionally linked to a BillPayment | → **Expense** |
| Reminder | Standalone recurring reminder | **Removed** |

### Redesigned Entities
| Entity | Purpose |
|---|---|
| **Wallet** | Money source — credit card, cash, or normal payment method |
| **Payment** | Transaction drawing money from a wallet |
| **ExpenseType** | Hierarchical category with parent_id, fixed-day/flexible recurrence, `next_due_day` for postponement |
| **Expense** | Incurred expense linked to wallet and/or payment |

### New Data Model (Proposed Schema)

Based on the schemas defined in REDESIGN.md:

#### Wallet
```sql
CREATE TABLE wallets (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER NOT NULL REFERENCES users(id),
    name                    VARCHAR(255) NOT NULL,
    icon                    VARCHAR(50),
    color                   VARCHAR(10),    -- hex color code
    description             TEXT,
    is_credit               BOOLEAN NOT NULL DEFAULT FALSE,
    is_cash                 BOOLEAN NOT NULL DEFAULT FALSE,
    bill_period             VARCHAR(20) NOT NULL DEFAULT 'none',
        -- enum: none, monthly, bimonthly, quarterly, fourmonths, semiannually, annually
    bill_due_day            INTEGER DEFAULT 0,  -- day of month (1-31), 0 = no specific day
    stopped                 BOOLEAN NOT NULL DEFAULT FALSE,
    default_expense_type_id INTEGER REFERENCES expense_types(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,

    -- A wallet cannot be both credit and cash
    CONSTRAINT chk_wallet_type CHECK (NOT (is_credit AND is_cash))
);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
```
**Key changes from BillType:**
- Two booleans `is_credit` and `is_cash` replace the old implicit "billable" type:
  - `is_credit=true, is_cash=false` → Credit card wallet
  - `is_credit=false, is_cash=true` → Cash wallet
  - `is_credit=false, is_cash=false` → Normal payment wallet (bank transfer, e-wallet, etc.)
  - `is_credit=true, is_cash=true` → **Invalid** (enforced by CHECK constraint)
- Replaced `bill_cycle` (int months) with `bill_period` enum for clarity
- Added `color` (hex) and `description` (replaces old color-only field)
- Added `default_expense_type_id` (inverse of old `expense_type_id` on BillType)

#### ExpenseType
```sql
CREATE TABLE expense_types (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    parent_id           INTEGER REFERENCES expense_types(id),  -- NULL = top-level
    name                VARCHAR(255) NOT NULL,
    icon                VARCHAR(50),
    color               VARCHAR(10),    -- hex color code
    description         TEXT,
    default_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
    default_wallet_id   INTEGER REFERENCES wallets(id),
    recurring_type      VARCHAR(20) NOT NULL DEFAULT 'none',
        -- enum: none, fixed_day, flexible
    recurring_period    VARCHAR(20) NOT NULL DEFAULT 'none',
        -- enum: none, weekly, biweekly, monthly, bimonthly, quarterly, fourmonths, semiannually, annually
    recurring_due_day   INTEGER DEFAULT 0,  -- day of month for fixed_day type (1-31)
    next_due_day        DATE,               -- next due date, user can postpone by updating this
    stopped             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ,

    CONSTRAINT chk_recurring_type CHECK (recurring_type IN ('none', 'fixed_day', 'flexible')),
    CONSTRAINT chk_recurring_period CHECK (recurring_period IN ('none', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'fourmonths', 'semiannually', 'annually'))
);
CREATE INDEX idx_expense_types_user_id ON expense_types(user_id);
CREATE INDEX idx_expense_types_parent_id ON expense_types(parent_id);
CREATE INDEX idx_expense_types_next_due_day ON expense_types(next_due_day);
```
**Key changes from current ExpenseType:**
- Added `parent_id` for hierarchical grouping (NULL = top-level)
- Replaced `bill_day`/`bill_cycle` with explicit `recurring_type` (none / fixed_day / flexible) and `recurring_period` enum
- `recurring_period` supports weekly and biweekly (not just monthly multiples)
- Added `next_due_day` (DATE) — the computed/postponable next due date. For fixed_day types, auto-calculated; for flexible types, user can postpone by updating this directly
- Kept `color` (hex) and added `description`
- Renamed `fixed_amount` → `default_amount` (NUMERIC instead of string)
- Renamed `default_bill_type_id` → `default_wallet_id`
- Added `stopped` field

#### Payment
```sql
CREATE TABLE payments (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    wallet_id   INTEGER NOT NULL REFERENCES wallets(id),
    amount      NUMERIC(12,2) NOT NULL,
    date        DATE NOT NULL,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_wallet_id ON payments(wallet_id);
CREATE INDEX idx_payments_date ON payments(date);
```
**Key changes from BillPayment:**
- Renamed `bill_type_id` → `wallet_id`
- Replaced `year`/`month` integer pair with proper `date` (DATE) column
- Uses `NUMERIC(12,2)` instead of string for amount

#### Expense
```sql
CREATE TABLE expenses (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    expense_type_id INTEGER NOT NULL REFERENCES expense_types(id),
    wallet_id       INTEGER REFERENCES wallets(id),
    payment_id      INTEGER REFERENCES payments(id),
    amount          NUMERIC(12,2) NOT NULL,
    date            DATE NOT NULL,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_expense_type_id ON expenses(expense_type_id);
CREATE INDEX idx_expenses_wallet_id ON expenses(wallet_id);
CREATE INDEX idx_expenses_payment_id ON expenses(payment_id);
CREATE INDEX idx_expenses_date ON expenses(date);
```
**Key changes from ExpenseItem:**
- Renamed `bill_type_id` → `wallet_id`, `bill_payment_id` → `payment_id`
- Replaced `year`/`month` with proper `date` (DATE)
- Uses `NUMERIC(12,2)` instead of string for amount

---

## 2. Database Engine: SQLite → PostgreSQL

### Why PostgreSQL
- **CHECK constraints**: Enforce `is_credit` and `is_cash` mutual exclusion at the database level
- **Native NUMERIC type**: Proper decimal arithmetic (no more string-encoded amounts + big.Float)
- **DATE/TIMESTAMPTZ types**: First-class date handling instead of year/month integer pairs
- **Concurrent access**: Production-ready multi-connection support
- **Indexing**: Partial indexes, expression indexes for complex queries
- **Scalability**: Ready for future features (full-text search, JSON columns, etc.)

### Server Changes
| Area | Change |
|---|---|
| **go.mod** | Replace `gorm.io/driver/sqlite` with `gorm.io/driver/postgres` |
| **config.go** | Replace `DBPath` with `DatabaseURL` (PostgreSQL connection string) |
| **cmd/api/main.go** | Change `sqlite.Open(...)` to `postgres.Open(...)` |
| **Dockerfile** | Remove `build-base` (no CGo needed); add PostgreSQL client for healthchecks |
| **docker-compose.yml** | New: add PostgreSQL service container |
| **Models** | Remove `type:decimal(10,2)` string hack; use `NUMERIC` natively. Remove `big.Float` helpers |
| **GORM tags** | Update column types from SQLite-isms to Postgres (`type:varchar`, `type:numeric`, `type:timestamptz`) |

### Config Change
```go
// Before (SQLite)
type Config struct {
    Port      string
    DBPath    string        // "./data/jiceot.db"
    JWTSecret string
    JWTExpiry time.Duration
}

// After (PostgreSQL)
type Config struct {
    Port        string
    DatabaseURL string        // "postgres://user:pass@host:5432/jiceot?sslmode=disable"
    JWTSecret   string
    JWTExpiry   time.Duration
}
```

No data migration is needed — this is a clean deployment with fresh PostgreSQL tables via GORM AutoMigrate.

---

## 3. Removed Features

### Reminder System — Removed
The entire reminder feature (model, service, handler, background goroutine, and all client pages) is being removed:

**Server removals:**
- `server/internal/reminders/` — entire package (reminder.go, reminder_service.go, reminder_handler.go)
- `server/internal/notifications/` — entire package (remind_service.go, bark_client.go, user_setting.go, user_setting_handler.go, user_setting_service.go)
- All reminder/notification routes in `cmd/api/main.go`
- `reminders.Reminder` and `notifications.UserNotificationSetting` from AutoMigrate
- Background reminder goroutine startup and shutdown logic

**Client removals (in old `client/`, not applicable to new `client/`):**
- RemindersPage, ReminderFormPage
- NotificationSettingsPage
- Notification.tsx component (bell icon with reminder dropdown)
- TimezoneSelect.tsx (only used for reminders)
- All reminder/notification API endpoints and types

**Rationale:** Expense-related recurrence is now handled directly on ExpenseType via `recurring_type`, `recurring_period`, and `next_due_day`. The standalone reminder system added complexity without fitting the redesigned wallet/expense model.

### iOS App — Removed
The entire `ios/` directory is being removed. The web app (served as the `client/` build) is the sole frontend.

---

## 4. Refactor vs Rewrite Analysis

### Server (Go)

| Component | Recommendation | Rationale |
|---|---|---|
| **cmd/api/main.go** | Refactor | Same init pattern; swap DB driver, remove reminder/notification init, update model refs and routes |
| **internal/config.go** | Refactor | Replace `DBPath` with `DatabaseURL` env var |
| **internal/auth/** | Keep as-is | Auth flow unchanged (JWT, devices, rate limiting) |
| **internal/users/** | Keep as-is | User model and service unchanged |
| **internal/expenses/bill_type*.go** | Rewrite → Wallet | New boolean flags, `bill_period` enum, `color`, `description`, `default_expense_type_id` |
| **internal/expenses/bill_payment*.go** | Rewrite → Payment | `date` replaces year/month, `NUMERIC` amount. Simpler model |
| **internal/expenses/expense_type*.go** | Rewrite | `parent_id`, `recurring_type`/`recurring_period` enums, `next_due_day`, `stopped`, `color`, `description` |
| **internal/expenses/expense_item*.go** | Rewrite → Expense | `date` replaces year/month, `NUMERIC` amount, field renaming |
| **internal/dashboard/** | Rewrite | Queries change for wallet booleans, date-based payments, `next_due_day` |
| **internal/reports/** | Rewrite | Hierarchical expense types, wallet boolean grouping, date-range queries |
| **internal/reminders/** | **Delete** | Feature removed |
| **internal/notifications/** | **Delete** | Feature removed |

**Server verdict: Rewrite the expenses package; delete reminders/notifications; refactor infra.**

### Client — Full Rewrite in `client/`

Rather than modifying the existing `client/` codebase file-by-file, the frontend will be **fully rewritten in a new `client/` directory**. Reasons:
- Nearly every page needs rewriting due to schema changes (date fields, numeric amounts, wallet booleans)
- Removing reminders/notifications eliminates several pages and components
- Clean separation allows running old and new clients side-by-side during development
- Opportunity to adopt newer patterns (better component structure, cleaner types)
- No risk of breaking the existing working app during development

The new `client/` will use the same tech stack:
- React 19 + TypeScript
- Tailwind CSS v4
- Vite
- React Router
- Axios
- Headless UI / Heroicons

---

## 5. Key Design Decisions

### 5.1 Wallet Type: Booleans vs Enum
| `is_credit` | `is_cash` | Wallet Type | Example |
|---|---|---|---|
| `false` | `false` | Normal | Bank account, e-wallet, debit card |
| `true` | `false` | Credit | Credit card |
| `false` | `true` | Cash | Physical cash, petty cash |
| `true` | `true` | **Invalid** | Enforced by DB constraint |

### 5.2 Recurrence on ExpenseType
Expense recurrence is a first-class property of ExpenseType:
- **`recurring_type = 'none'`**: One-off expense category (groceries, dining)
- **`recurring_type = 'fixed_day'`**: Due on a specific day each period (rent on 1st, insurance on 15th)
- **`recurring_type = 'flexible'`**: Due after a period from last completion (haircut every 6 weeks)

The `next_due_day` field (DATE) serves dual purpose:
- For **fixed_day**: Auto-computed from `recurring_due_day` + `recurring_period`. Advances automatically when expense is recorded
- For **flexible**: Set to "last expense date + period". User can manually postpone by updating `next_due_day` directly

Any expense type's `next_due_day` can be manually adjusted, eliminating the need for a separate "custom" recurrence mode.

### 5.3 Recurring Period Enum
Supports both week-based and month-based periods:
| Value | Duration |
|---|---|
| `none` | No recurrence |
| `weekly` | 7 days |
| `biweekly` | 14 days |
| `monthly` | 1 month |
| `bimonthly` | 2 months |
| `quarterly` | 3 months |
| `fourmonths` | 4 months |
| `semiannually` | 6 months |
| `annually` | 12 months |

### 5.4 Date Fields Instead of Year/Month
Payments and Expenses use a `date DATE` column instead of separate `year`/`month` integers:
- Precise day-level tracking
- Simplifies date range queries (`WHERE date BETWEEN $1 AND $2`)
- Works naturally with PostgreSQL date functions
- Client uses ISO date strings (`2026-03-14`)

### 5.5 NUMERIC Amounts Instead of Strings
PostgreSQL `NUMERIC(12,2)` replaces the string-encoded decimal hack:
- No more `big.Float` conversion methods on every model
- Direct arithmetic in SQL queries (`SUM(amount)`, `amount > 0`)
- GORM maps to Go `float64` or `shopspring/decimal` type
- Client receives numbers directly (no string parsing)

---

## 6. New User Flows

### 6.1 Add Expense
1. User selects expense type → amount → date → wallet (optional)
2. System creates Expense record
3. If wallet `is_cash=true`, tries to find/link a relevant cash payment
4. If expense type has `recurring_type != 'none'`, system auto-advances `next_due_day`

### 6.2 Add Expense by Credit Card
1. User selects expense type → amount → selects credit wallet (`is_credit=true`)
2. System creates Expense linked to wallet (no payment yet)
3. Expense appears in wallet's unbilled expenses list

### 6.3 Pay Credit Card
1. User navigates to credit wallet → "Pay Bill"
2. System shows all unbilled expenses for this wallet
3. User selects expenses to include (or select all)
4. Payment created, selected expenses linked to payment
5. Default expense auto-adjusted if payment amount differs from total selected

### 6.4 Transfer to Cash Wallet
1. User creates Payment from source wallet
2. Default expense auto-calculated for the transfer
3. When expenses are later linked to the cash wallet, default expense auto-adjusts

### 6.5 Set Expense as Periodic (Fixed Day)
1. On ExpenseType form, set `recurring_type = 'fixed_day'`
2. Set `recurring_period` (e.g., monthly) and `recurring_due_day` (e.g., 15)
3. System computes `next_due_day` automatically
4. Shows on dashboard as "due" item when approaching

### 6.6 Set Expense as Flexible
1. On ExpenseType form, set `recurring_type = 'flexible'`
2. Set `recurring_period` (e.g., biweekly, monthly)
3. `next_due_day` computed as last expense date + period
4. Shows on dashboard as "suggested" item
5. User can postpone by updating `next_due_day` directly (e.g., push 1 week)

### 6.7 Set Credit Card Bill Period
1. On Wallet form, set `bill_period` and `bill_due_day`
2. System uses these to show "credit card bill due" on dashboard

---

## 7. Implementation Phases

### Phase 0: PostgreSQL Setup & Server Infrastructure
**Scope:** Switch database engine, remove reminder/notification system, clean up server

1. Add `gorm.io/driver/postgres` to `go.mod`, remove `gorm.io/driver/sqlite`
2. Update `config.go`:
   - Replace `DBPath` with `DatabaseURL` (e.g., `DATABASE_URL=postgres://...`)
   - Default for local dev: `postgres://jiceot:jiceot@localhost:5432/jiceot?sslmode=disable`
3. Update `cmd/api/main.go`:
   - Change `gorm.Open(sqlite.Open(...))` to `gorm.Open(postgres.Open(...))`
   - Remove `os.MkdirAll(filepath.Dir(config.DBPath))`
   - Remove Reminder and UserNotificationSetting from AutoMigrate
   - Remove reminder/notification service init, handler init, route registration
   - Remove background reminder goroutine and shutdown logic
4. Update `Dockerfile`:
   - Remove `RUN apk add --no-cache build-base` (no CGo)
   - Update client build stage to use `client/` instead of `client/`
5. Create `docker-compose.yml`:
   - `postgres:16-alpine` service with persistent volume
   - API service with `DATABASE_URL` env var
6. Delete `server/internal/reminders/` directory
7. Delete `server/internal/notifications/` directory
8. Delete `ios/` directory
9. Update `.env.example` with new database config

**Files to modify:**
- `server/go.mod` — swap sqlite → postgres driver
- `server/internal/config.go` — `DBPath` → `DatabaseURL`
- `server/cmd/api/main.go` — DB init, remove reminders/notifications
- `Dockerfile` — remove build-base, update client path

**Files to create:**
- `docker-compose.yml`

**Files/directories to delete:**
- `server/internal/reminders/` (entire directory)
- `server/internal/notifications/` (entire directory)
- `ios/` (entire directory)

### Phase 1: Server Models & Schema
**Scope:** New GORM models with PostgreSQL types

1. **Wallet model** (`wallet.go`):
   - `is_credit bool`, `is_cash bool` with GORM check constraint
   - `bill_period` string with validation
   - `bill_due_day int`
   - `color` (hex) and `description`
   - `default_expense_type_id *uint`
   - `stopped bool`
   - No `big.Float` methods — NUMERIC maps directly

2. **ExpenseType model** (`expense_type.go` — rewrite):
   - `parent_id *uint` for hierarchy
   - `recurring_type` (none/fixed_day/flexible)
   - `recurring_period` (none/weekly/biweekly/monthly/...)
   - `recurring_due_day int`
   - `next_due_day *time.Time` (DATE in Postgres)
   - `default_amount float64` (NUMERIC in Postgres)
   - `default_wallet_id *uint`
   - `color` (hex) and `description`
   - `stopped bool`

3. **Payment model** (`payment.go`):
   - `wallet_id uint`
   - `amount float64` (NUMERIC)
   - `date time.Time` (DATE)
   - `note string`

4. **Expense model** (`expense.go`):
   - `expense_type_id uint`
   - `wallet_id *uint`
   - `payment_id *uint`
   - `amount float64` (NUMERIC)
   - `date time.Time` (DATE)
   - `note string`

5. Update auto-migrate in `main.go` with new models

**Files to create:**
- `server/internal/expenses/wallet.go`
- `server/internal/expenses/payment.go`
- `server/internal/expenses/expense.go`

**Files to rewrite:**
- `server/internal/expenses/expense_type.go`

**Files to delete (end of phase):**
- `server/internal/expenses/bill_type.go`
- `server/internal/expenses/bill_payment.go`
- `server/internal/expenses/expense_item.go`

### Phase 2: Server Services & Handlers
**Scope:** Business logic and API endpoints

1. **Wallet** service + handler:
   - CRUD with `is_credit`/`is_cash` validation (cannot both be true)
   - Toggle stopped
   - List with filters (credit/cash/normal/all, include_stopped)
   - `GET /api/wallets/:id/unbilled-expenses` — expenses linked to wallet with no payment
   - `GET /api/wallets/:id/payments` — payments for wallet

2. **Payment** service + handler:
   - CRUD with wallet ownership check
   - List with filters (wallet_id, date range)
   - Link expenses to payment on create/update
   - Auto-create default expense for credit card payments and transfers
   - Monthly total by date range

3. **ExpenseType** service + handler:
   - CRUD with `parent_id` hierarchy (limit 2 levels)
   - `recurring_type` / `recurring_period` validation
   - Auto-compute `next_due_day` on create
   - `GET /api/expense-types/tree` — hierarchical list grouped by parent
   - `PUT /api/expense-types/:id/postpone` — update `next_due_day` for flexible types
   - Toggle stopped

4. **Expense** service + handler:
   - CRUD with wallet/payment linkage
   - On create: if expense type is recurring, auto-advance `next_due_day`
   - On create: if wallet is_cash, find matching cash payment
   - List with filters (expense_type_id, wallet_id, payment_id, date range, unbilled_only)

5. **Dashboard** service + handler (rewrite):
   - Stats: total expenses, payments made, pending wallets, categories
   - Due wallets: credit wallets with `bill_due_day` approaching
   - Due expenses: expense types with `next_due_day` approaching or past
   - Separate fixed_day (due/overdue) from flexible (suggested)

6. **Reports** service + handler (rewrite):
   - Monthly report: date-range based, hierarchical expense type breakdown
   - Yearly report: 12-month summary with parent-group aggregation
   - Wallet-based breakdown (credit vs cash vs normal)

**API Endpoint Map:**
| Current | New |
|---|---|
| `GET/POST /api/bill-types` | `GET/POST /api/wallets` |
| `GET/PUT/DELETE /api/bill-types/:id` | `GET/PUT/DELETE /api/wallets/:id` |
| `POST /api/bill-types/:id/toggle` | `POST /api/wallets/:id/toggle` |
| `GET /api/bill-types/:id/payments` | `GET /api/wallets/:id/payments` |
| — | `GET /api/wallets/:id/unbilled-expenses` |
| `GET/POST /api/bill-payments` | `GET/POST /api/payments` |
| `GET/PUT/DELETE /api/bill-payments/:id` | `GET/PUT/DELETE /api/payments/:id` |
| `GET /api/bill-payments/monthly-total` | `GET /api/payments/monthly-total` |
| `GET/POST /api/expense-types` | `GET/POST /api/expense-types` (same) |
| `GET/PUT/DELETE /api/expense-types/:id` | `GET/PUT/DELETE /api/expense-types/:id` (same) |
| — | `GET /api/expense-types/tree` |
| — | `PUT /api/expense-types/:id/postpone` |
| `GET/POST /api/expense-items` | `GET/POST /api/expenses` |
| `GET/PUT/DELETE /api/expense-items/:id` | `GET/PUT/DELETE /api/expenses/:id` |
| `GET /api/expense-items/monthly/:year/:month` | `GET /api/expenses/by-date?from=&to=` |
| `GET /api/dashboard/due-bills` | `GET /api/dashboard/due-wallets` |
| `GET /api/dashboard/due-expenses` | `GET /api/dashboard/due-expenses` (updated logic) |
| `GET/POST/PUT/DELETE /api/reminders/*` | **Removed** |
| `GET/PUT /api/notifications/*` | **Removed** |

**Files to create:**
- `server/internal/expenses/wallet_service.go`
- `server/internal/expenses/wallet_handler.go`
- `server/internal/expenses/payment_service.go`
- `server/internal/expenses/payment_handler.go`
- `server/internal/expenses/expense_service.go`
- `server/internal/expenses/expense_handler.go`

**Files to rewrite:**
- `server/internal/expenses/expense_type_service.go`
- `server/internal/expenses/expense_type_handler.go`
- `server/internal/dashboard/dashboard_service.go`
- `server/internal/dashboard/dashboard_handler.go`
- `server/internal/reports/reports_service.go`
- `server/internal/reports/reports_handler.go`

**Files to modify:**
- `server/cmd/api/main.go` — update service init, handler init, route registration

**Files to delete (end of phase):**
- `server/internal/expenses/bill_type_service.go`
- `server/internal/expenses/bill_type_handler.go`
- `server/internal/expenses/bill_payment_service.go`
- `server/internal/expenses/bill_payment_handler.go`
- `server/internal/expenses/expense_item_service.go`
- `server/internal/expenses/expense_item_handler.go`

### Phase 3: Client Rewrite — Project Setup & Foundation
**Scope:** Scaffold `client/` and build core infrastructure

1. **Initialize project:**
   ```bash
   npm create vite@latest client -- --template react-ts
   ```
2. **Install dependencies** (same stack as current client):
   - `react`, `react-dom`, `react-router-dom`
   - `axios`
   - `@headlessui/react`, `@heroicons/react`
   - `tailwindcss`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`
   - Dev: `typescript`, `eslint`, `vitest`

3. **Build foundation layer:**
   - `src/services/api.ts` — Axios instance with interceptors, token refresh logic (adapt from current client)
   - `src/contexts/AuthContext.tsx` — Auth state, login/register/logout (adapt from current)
   - `src/types/` — All TypeScript interfaces:
     ```typescript
     // types/auth.ts
     interface User { id, email, name, created_at, updated_at }
     interface AuthResponse { token, expires_at, user }

     // types/wallet.ts
     interface Wallet { id, name, icon, color, description, is_credit, is_cash, bill_period, bill_due_day, stopped, default_expense_type_id?, ... }

     // types/expense.ts
     interface ExpenseType { id, name, icon, color, description, default_amount, default_wallet_id?, recurring_type, recurring_period, recurring_due_day, next_due_day?, stopped, parent_id?, children?, ... }
     interface Expense { id, expense_type_id, wallet_id?, payment_id?, amount, date, note, ... }

     // types/payment.ts
     interface Payment { id, wallet_id, amount, date, note, wallet?, ... }

     // types/dashboard.ts
     interface DashboardStats { ... }
     interface DueWallet { ... }
     interface DueExpense { ... }
     ```
   - `src/common/constants.ts` — Period options, recurring type options, preset colors/icons
   - `src/common/date.ts` — ISO date utilities
   - `src/common/currency.ts` — Format currency (now receives numbers, not strings)

4. **API service endpoints:**
   - `walletAPI` — CRUD + toggle + unbilled-expenses + payments
   - `paymentAPI` — CRUD + monthly-total (date range params)
   - `expenseTypeAPI` — CRUD + tree + postpone + toggle
   - `expenseAPI` — CRUD + by-date
   - `dashboardAPI` — stats + due-wallets + due-expenses
   - `reportsAPI` — monthly + yearly
   - `authAPI` — login, register, me, logout, refresh, changePassword, deleteAccount
   - `deviceAPI` — list, delete, deleteAll

**Files to create in `client/`:**
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, etc.
- `src/main.tsx`, `src/App.tsx`, `src/index.css`
- `src/services/api.ts`
- `src/contexts/AuthContext.tsx`
- `src/types/auth.ts`, `wallet.ts`, `expense.ts`, `payment.ts`, `dashboard.ts`
- `src/common/constants.ts`, `date.ts`, `currency.ts`

### Phase 4: Client Rewrite — Shared Components & Layout
**Scope:** Build reusable components and app shell

1. **Layout.tsx** — Sidebar navigation, header, mobile responsive:
   - Dashboard, Due Items, Wallets, Payments, Expense Types, Expenses, Reports, Settings
   - No "Reminders" or notification bell
2. **QuickAddButton.tsx** — FAB with wallet-grouped quick actions
3. **IconPicker.tsx** — Emoji selector (adapt from current)
4. **Shared form components** — Date pickers, wallet selectors, period selectors
5. **Auth pages** — LoginPage, RegisterPage (adapt from current)
6. **Settings pages** — SettingsPage, ChangePasswordPage, DevicesPage (adapt from current)

**Files to create in `client/src/`:**
- `components/Layout.tsx`
- `components/QuickAddButton.tsx`
- `components/IconPicker.tsx`
- `pages/LoginPage.tsx`
- `pages/RegisterPage.tsx`
- `pages/SettingsPage.tsx`
- `pages/ChangePasswordPage.tsx`
- `pages/DevicesPage.tsx`

### Phase 5: Client Rewrite — Core CRUD Pages
**Scope:** All entity list and form pages

1. **WalletsPage** — Filter by credit/cash/normal, toggle stopped, delete
2. **WalletFormPage** — is_credit/is_cash toggles, bill_period, color, description
3. **PaymentsPage** — Filter by wallet + date range, totals
4. **PaymentFormPage** — Wallet selector, date picker, unbilled expenses checklist (for credit)
5. **ExpenseTypesPage** — Hierarchical tree view, recurring badges, next_due_day, postpone button
6. **ExpenseTypeFormPage** — parent_id, recurring_type/period, color, description, next_due_day
7. **ExpensesPage** — Filter by type/wallet/date/unbilled, totals
8. **ExpenseFormPage** — Expense type, date picker, wallet, auto-fill from defaults
9. **BatchCreateTypesPage** — Bulk create wallets + expense types

**Files to create in `client/src/pages/`:**
- `WalletsPage.tsx`, `WalletFormPage.tsx`
- `PaymentsPage.tsx`, `PaymentFormPage.tsx`
- `ExpenseTypesPage.tsx`, `ExpenseTypeFormPage.tsx`
- `ExpensesPage.tsx`, `ExpenseFormPage.tsx`
- `BatchCreateTypesPage.tsx`

### Phase 6: Client Rewrite — Dashboard, Due Items, Reports
**Scope:** Overview and analytics pages

1. **Dashboard**:
   - Wallet summary cards grouped by type (credit/cash/normal)
   - Due items: fixed_day expenses (overdue/due soon) and wallet bills by `bill_due_day`
   - Suggested items: flexible expenses approaching `next_due_day`
   - Quick actions: Add expense, Pay credit card, Record payment
   - Recent activity feed

2. **DueItemsPage**:
   - "Due" section: fixed_day expense types + wallet bills
   - "Suggested" section: flexible expense types
   - Postpone button for flexible types
   - Status: overdue / due_soon / upcoming based on `next_due_day`

3. **ReportsPage**:
   - Monthly/Yearly views with date range pickers
   - Hierarchical expense breakdown (parent groups with expandable children)
   - Wallet-type breakdown (credit vs cash vs normal)

**Files to create in `client/src/pages/`:**
- `Dashboard.tsx`
- `DueItemsPage.tsx`
- `ReportsPage.tsx`

### Phase 7: Integration & Cleanup
**Scope:** Wire everything together, update build pipeline

1. **App.tsx** — Complete route table:
   - `/login`, `/register` (public)
   - `/`, `/dashboard`, `/wallets/*`, `/payments/*`, `/expense-types/*`, `/expenses/*`
   - `/due-items`, `/reports`, `/settings/*`, `/change-password`
   - `/batch-create-types`
2. **Dockerfile** update — Build from `client/` instead of `client/`
3. **build.sh** update — Point to `client/`
4. **Verify** static file serving in `cmd/api/main.go` serves `client/dist/`
5. **Final testing** — End-to-end smoke test of all flows
6. **Archive/remove** old `client/` directory (optional, can keep for reference)

---

## 8. Testing Strategy

| Layer | Approach |
|---|---|
| PostgreSQL connection | Integration test: connect, migrate, seed, query |
| Wallet CRUD | Unit tests: is_credit/is_cash validation, CHECK constraint, bill_period enum |
| Payment with dates | Unit tests: date range queries, wallet linkage, amount totals |
| Expense type hierarchy | Unit tests: parent_id tree building, max depth, recurring_type validation |
| next_due_day computation | Unit tests: fixed_day advance, flexible advance, postpone logic for all period types |
| Expense auto-advance | Integration test: create expense → verify next_due_day updated |
| Cash wallet flow | Integration test: create cash expense → find/link payment |
| Credit card pay flow | Integration test: create unbilled expenses → pay → verify linkage |
| Dashboard queries | Integration tests with seeded data, date-based queries |
| Reports aggregation | Integration tests: hierarchical grouping, date range, wallet type breakdown |
| Client API layer | Mock API tests with new types |
| Client pages | Component tests for date pickers, wallet toggles, hierarchy display |

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PostgreSQL connection issues in Docker | Low | Medium | docker-compose healthcheck; retry logic on startup |
| is_credit/is_cash confusion in UI | Low | Low | Clear labels, grouped display, constraint prevents invalid state |
| next_due_day drift for flexible types | Medium | Low | Show last expense date alongside next_due_day; allow manual override |
| Hierarchical expense types complexity | Low | Low | Limit depth to 2 levels (parent + child); flat fallback for reports |
| client rewrite scope | Medium | Medium | Phase by page group; test each phase before moving on |
| Losing reminder functionality | Low | Low | Expense recurrence on ExpenseType covers the primary use case |

---

## 10. Files Summary

### Server — Files to Create
- `server/internal/expenses/wallet.go` (model)
- `server/internal/expenses/wallet_service.go`
- `server/internal/expenses/wallet_handler.go`
- `server/internal/expenses/payment.go` (model)
- `server/internal/expenses/payment_service.go`
- `server/internal/expenses/payment_handler.go`
- `server/internal/expenses/expense.go` (model)
- `server/internal/expenses/expense_service.go`
- `server/internal/expenses/expense_handler.go`
- `docker-compose.yml`

### Server — Files to Rewrite
- `server/internal/expenses/expense_type.go`
- `server/internal/expenses/expense_type_service.go`
- `server/internal/expenses/expense_type_handler.go`
- `server/internal/dashboard/dashboard_service.go`
- `server/internal/dashboard/dashboard_handler.go`
- `server/internal/reports/reports_service.go`
- `server/internal/reports/reports_handler.go`

### Server — Files to Modify
- `server/go.mod` — swap sqlite → postgres driver
- `server/internal/config.go` — DatabaseURL
- `server/cmd/api/main.go` — DB init, remove reminders/notifications, update models/services/routes
- `Dockerfile` — remove build-base, update client path to client
- `build.sh` — update client path to client

### Server — Files to Delete
- `server/internal/reminders/` (entire directory)
- `server/internal/notifications/` (entire directory)
- `server/internal/expenses/bill_type.go`
- `server/internal/expenses/bill_type_service.go`
- `server/internal/expenses/bill_type_handler.go`
- `server/internal/expenses/bill_payment.go`
- `server/internal/expenses/bill_payment_service.go`
- `server/internal/expenses/bill_payment_handler.go`
- `server/internal/expenses/expense_item.go`
- `server/internal/expenses/expense_item_service.go`
- `server/internal/expenses/expense_item_handler.go`

### Client — Full Rewrite as `client/`
New directory `client/` with the following structure:
```
client/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.ts
├── index.html
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── common/
    │   ├── constants.ts
    │   ├── currency.ts
    │   └── date.ts
    ├── components/
    │   ├── Layout.tsx
    │   ├── QuickAddButton.tsx
    │   └── IconPicker.tsx
    ├── contexts/
    │   └── AuthContext.tsx
    ├── services/
    │   └── api.ts
    ├── types/
    │   ├── auth.ts
    │   ├── wallet.ts
    │   ├── expense.ts
    │   ├── payment.ts
    │   └── dashboard.ts
    └── pages/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── Dashboard.tsx
        ├── DueItemsPage.tsx
        ├── WalletsPage.tsx
        ├── WalletFormPage.tsx
        ├── PaymentsPage.tsx
        ├── PaymentFormPage.tsx
        ├── ExpenseTypesPage.tsx
        ├── ExpenseTypeFormPage.tsx
        ├── ExpensesPage.tsx
        ├── ExpenseFormPage.tsx
        ├── BatchCreateTypesPage.tsx
        ├── ReportsPage.tsx
        ├── SettingsPage.tsx
        ├── ChangePasswordPage.tsx
        └── DevicesPage.tsx
```

### Directories to Delete
- `ios/` (entire directory — iOS app removed)
- `client/` (archive or delete after client is verified)

### Unchanged
- `server/internal/auth/*`
- `server/internal/users/*`

---

## 11. Recommended Execution Order

```
Phase 0 (Postgres + Cleanup) ████░░░░░░░░░░░░░░░░  — DB swap, delete reminders/notifications/ios
Phase 1 (Server Models)      ░░████░░░░░░░░░░░░░░  — New GORM models
Phase 2 (Server Logic)       ░░░░░░████████░░░░░░  — Services, handlers, routes
Phase 3 (Client Foundation) ░░░░░░░░████░░░░░░░░  — Scaffold, types, API, auth (can overlap Phase 2)
Phase 4 (Client Components) ░░░░░░░░░░████░░░░░░  — Layout, shared components, auth pages
Phase 5 (Client CRUD)       ░░░░░░░░░░░░████░░░░  — Wallet/Payment/Expense pages
Phase 6 (Client Overview)   ░░░░░░░░░░░░░░████░░  — Dashboard, due items, reports
Phase 7 (Integration)        ░░░░░░░░░░░░░░░░████  — Routing, Dockerfile, build, final test
```

Phase 0 → 1 → 2 are strictly sequential (server). Phases 3-4 can start once the API contract from Phase 2 is defined (even before implementation is complete). Phases 5-7 depend on Phase 4.
