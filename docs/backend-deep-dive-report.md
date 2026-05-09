# BAPF Insurance Broker — Backend Deep-Dive Report & Local Setup Guide

> **Generated:** 2026-03-15
> **Branch:** `back4app`
> **Codebase Version:** Next.js 16.1.6 + Supabase

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Layer (PostgreSQL / Supabase)](#4-database-layer)
5. [API Routes — Full Catalog](#5-api-routes--full-catalog)
6. [Services Layer](#6-services-layer)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Security Layer](#8-security-layer)
9. [Realtime & Data Fetching](#9-realtime--data-fetching)
10. [Email System](#10-email-system)
11. [File Storage](#11-file-storage)
12. [Scheduled Jobs (pg_cron)](#12-scheduled-jobs-pg_cron)
13. [CI/CD Pipeline](#13-cicd-pipeline)
14. [Current Deployment (Vercel + Supabase Cloud)](#14-current-deployment)
15. [Local Development Setup — Docker + PostgreSQL](#15-local-development-setup--docker--postgresql)
16. [Quick Reference & Cheatsheet](#16-quick-reference--cheatsheet)

---

## 1. Architecture Overview

BAPF is a **monolithic full-stack Next.js 16 application**. There is no separate backend server — the frontend (React) and backend (API routes) coexist in a single codebase and deploy as one unit.

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  React 19 + SWR + Realtime WebSocket + Tailwind CSS + shadcn/ui │
└────────────────────────┬────────────────┬────────────────────────┘
                         │ HTTP/REST       │ WebSocket (Realtime)
                         ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 SERVER                             │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ proxy.ts    │  │ API Routes   │  │ React Server Components │ │
│  │ (Edge MW)   │  │ /api/*       │  │ + Client Components     │ │
│  │ - Auth gate │  │ - CRUD ops   │  │ - Dashboard pages       │ │
│  │ - Security  │  │ - Email      │  │ - Forms & tables        │ │
│  │   headers   │  │ - Upload     │  │ - PDF extraction        │ │
│  │ - Session   │  │ - Auth mgmt  │  └─────────────────────────┘ │
│  │   refresh   │  │ - Audit log  │                               │
│  └─────────────┘  └──────┬───────┘                               │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ Supabase Client (service_role key)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     SUPABASE (PostgreSQL)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ Database │  │   Auth   │  │ Storage  │  │    Realtime     │ │
│  │ 25 tables│  │ JWT/GoTrue│  │ S3-like  │  │ WebSocket push  │ │
│  │ RLS      │  │ User mgmt│  │ Signed   │  │ postgres_changes│ │
│  │ pg_cron  │  │ Sessions │  │ URLs     │  │ Single channel  │ │
│  │ Triggers │  │ Ban/Lock │  │ Buckets  │  │ 18 tables       │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Scheduled Jobs (pg_cron) — 6 automated daily/weekly/monthly ││
│  │ • Mark overdue premiums    • Auto-mark absent               ││
│  │ • Mark expired policies    • Weekly branch aggregation      ││
│  │ • Generate renewal alerts  • Monthly report generation      ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
                           │
                    SMTP (Nodemailer)
                           │
                    ┌──────▼──────┐
                    │ Email Server│
                    │ Gmail/SES/  │
                    │ SendGrid    │
                    └─────────────┘
```

### Request Flow (Example: Create Policy)

```
1. Browser → POST /api/policies (Bearer token in header)
2. proxy.ts (Edge) → validates Bearer token exists → forwards request
3. API route handler:
   a. protect() → rate limit check (30/min) + CSRF validation
   b. requireAuth() → verify JWT via Supabase Auth → fetch user profile → check role
   c. Validate body fields + Zod schema
   d. Auto-generate policy number via increment_policy_counter RPC (atomic)
   e. Insert into policies table (via supabaseAdmin — bypasses RLS)
   f. Insert audit_logs entry
   g. Return { id, policy_number } (201)
4. Supabase Realtime → fires postgres_changes event on policies table
5. All connected clients → SWR mutate() → UI refreshes instantly
```

---

## 2. Technology Stack

### Runtime & Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | Full-stack React framework (App Router) |
| **React** | 19.2.3 | UI rendering |
| **TypeScript** | ^5 | Type safety |
| **Node.js** | 20+ | Server runtime (via Vercel/local) |

### Backend Core

| Technology | Purpose |
|------------|---------|
| **Supabase (PostgreSQL)** | Database, Auth, Storage, Realtime |
| **@supabase/supabase-js** | Supabase client SDK |
| **@supabase/ssr** | Server-side Supabase client with cookie management |
| **Nodemailer** | SMTP email sending |
| **Zod** | Runtime schema validation for all API inputs |

### Database

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database (via Supabase) |
| **Row-Level Security (RLS)** | Access control at the database level |
| **pg_cron** | 6 scheduled background jobs |
| **Database triggers** | Auto-compute commissions, notify on audit events |
| **RPC functions** | Atomic counters, role checking, batch operations |

### Frontend

| Technology | Purpose |
|------------|---------|
| **SWR** | Data fetching with stale-while-revalidate caching |
| **Tailwind CSS v4** | Utility-first CSS |
| **shadcn/ui** | Component library (Radix UI primitives) |
| **Recharts** | Dashboard charts |
| **Framer Motion** | Page/component animations |
| **react-hook-form** | Form state management |
| **date-fns** | Date formatting/manipulation |
| **xlsx / papaparse** | Excel/CSV export |
| **pdf-lib** | PDF generation/manipulation |

### Monitoring & Deployment

| Technology | Purpose |
|------------|---------|
| **Sentry** | Error tracking (client + server + edge) |
| **Vercel Analytics** | Performance monitoring |
| **GitHub Actions** | CI/CD pipeline |
| **Vercel** | Current hosting (mumbai/bom1 region) |

---

## 3. Project Structure

```
bapf/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API routes (15 routes)
│   │   ├── health/route.ts       # Health check
│   │   ├── users/                # User CRUD (admin only)
│   │   ├── policies/             # Policy CRUD + lock + verify
│   │   ├── customers/            # Customer mgmt + portal accounts
│   │   ├── email/                # Email dispatch + reminders
│   │   ├── upload/route.ts       # Storage signed URLs
│   │   ├── extract-pdf/route.ts  # PDF text extraction proxy
│   │   └── attendance/           # Attendance notifications
│   ├── (auth)/                   # Auth layout (login page)
│   └── dashboard/                # Protected dashboard pages (15+ pages)
│
├── lib/                          # Shared library code
│   ├── api/                      # API middleware
│   │   ├── auth-middleware.ts    # JWT verification + role check
│   │   └── protect.ts           # Rate limit + CSRF guard
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts            # Browser client (anon key)
│   │   ├── server.ts            # Server client (service_role key)
│   │   ├── middleware.ts         # Middleware client + session refresh
│   │   └── database.types.ts    # Auto-generated TypeScript types
│   ├── services/                 # Service layer (14 services)
│   │   ├── auth.service.ts       # Login, logout, password reset
│   │   ├── policy.service.ts     # Policy CRUD + expiry buckets
│   │   ├── customer.service.ts   # Customer CRUD + bulk import
│   │   ├── email.service.ts      # Email templates + SMTP (33KB)
│   │   ├── attendance.service.ts # Attendance + holidays
│   │   ├── commission.service.ts # Commission calculations
│   │   └── ... (10 more)
│   ├── hooks/                    # React data-fetching hooks
│   │   ├── use-supabase-query.ts # Core SWR hook (useCollection/useDoc)
│   │   ├── use-realtime.ts       # Singleton Realtime WebSocket
│   │   └── ... (14 domain hooks)
│   ├── security/                 # Security modules
│   │   ├── rate-limiter.ts       # In-memory sliding window
│   │   ├── csrf.ts               # Origin/Referer CSRF protection
│   │   ├── headers.ts            # Security headers + IP whitelist
│   │   └── forbidden-logger.ts   # Audit logging for blocked requests
│   ├── validations/              # Zod schemas (11 files)
│   ├── context/                  # React contexts
│   │   ├── auth-context.tsx      # AuthProvider + session timeout
│   │   └── app-settings-context.tsx
│   ├── permissions.ts            # RBAC permission matrix
│   ├── types/index.ts            # TypeScript interfaces
│   └── helpers/                  # Utilities (PDF, storage, export, etc.)
│
├── components/                   # React UI components
├── supabase/                     # Database
│   ├── migrations/               # SQL migrations (001-011)
│   │   └── 001_initial_schema.sql # 1,151 lines — full schema
│   └── seed.sql                  # Demo data (25KB)
├── scripts/
│   └── db-push.mjs              # Direct PostgreSQL migration runner
├── docs/                         # Deployment guides
├── tests/                        # Vitest unit/integration tests
├── e2e/                          # Playwright E2E tests
├── proxy.ts                      # Edge middleware (auth gate + headers)
├── next.config.ts                # Next.js config (Sentry, images, headers)
├── package.json                  # Dependencies & scripts
├── vercel.json                   # Vercel config (region: bom1)
└── .env.example                  # Environment variable template
```

---

## 4. Database Layer

### 4.1 Tables (25)

| # | Table | Rows (seed) | Purpose |
|---|-------|-------------|---------|
| 1 | `branches` | 2 | Office branches (Mumbai HQ, Pune) |
| 2 | `users` | 4 | Staff profiles (admin, manager, 2 employees) |
| 3 | `counters` | 1 | Atomic sequence counters (customer UIDs) |
| 4 | `customers` | 10 | Customer master records |
| 5 | `campaigns` | 0 | Marketing campaigns with ROI tracking |
| 6 | `policies` | 15 | Insurance policies (12 types supported) |
| 7 | `commission_rules` | 9 | Configurable commission rates per policy type |
| 8 | `renewals` | 0 | Policy renewal tracking |
| 9 | `premiums` | 15 | Premium payment records |
| 10 | `commissions` | 15 | Agent commission records (auto-created by trigger) |
| 11 | `attendance` | 0 | Daily check-in/out records |
| 12 | `early_checkout_requests` | 0 | Early departure approval workflow |
| 13 | `holidays` | 0 | Holiday calendar |
| 14 | `documents` | 0 | Uploaded file metadata |
| 15 | `notifications` | 0 | In-app notifications |
| 16 | `audit_logs` | 0 | Immutable audit trail |
| 17 | `system_config` | 15 | Key-value settings store |
| 18 | `company_templates` | 0 | PDF extraction patterns |
| 19 | `daily_reminders` | 0 | Dismissible per-user reminders |
| 20 | `policy_verification_logs` | 0 | Immutable verification checklist records |
| 21 | `login_attempts` | 0 | Failed login tracking for lockout |
| 22 | `aggregations` | 0 | Cached branch-level weekly/monthly stats |
| 23 | `reports` | 0 | Generated monthly reports (JSONB) |
| 24 | `archives` | 0 | Soft-deleted policy snapshots |
| 25 | `customer_portal_users` | 0 | Customer portal auth mapping |

### 4.2 Custom Enum Types (11)

```sql
user_role          = admin | manager | employee
user_status        = active | inactive
policy_status      = active | expired | cancelled | archived
policy_type_enum   = motor | health | life | fire | marine | burglary |
                     liability | workmen_compensation | car_ear |
                     surety_bond | travel | other
payment_frequency  = annual | semi-annual | quarterly | monthly | single
renewal_status     = due | contacted | renewed | lost
premium_status     = pending | collected | overdue
commission_status  = pending | approved | paid | rejected
commission_type    = percentage | flat
attendance_status  = present | absent | half-day | late | leave
early_checkout_status = pending | approved | rejected
campaign_status    = draft | active | completed
```

### 4.3 RPC Functions (7)

| Function | Purpose |
|----------|---------|
| `update_updated_at()` | Trigger function — auto-sets `updated_at` on every row change |
| `next_customer_uid()` | Atomic customer UID generation (`C-0001`, `C-0002`, ...) |
| `bulk_next_customer_uids(n)` | Batch UID reservation for bulk import |
| `increment_counter(id, amount)` | Generic atomic counter increment |
| `increment_policy_counter(key, type, year)` | Atomic policy number generation |
| `auth_user_role()` | Extracts user role from JWT claims or `users` table |
| `is_admin()` / `is_admin_or_manager()` | Role check helpers for RLS policies |

### 4.4 Database Triggers (3)

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `trg_policy_after_insert` | `policies` | AFTER INSERT | Auto-creates commission record by matching `commission_rules` |
| `trg_policy_after_cancel` | `policies` | AFTER UPDATE (status → cancelled) | Rejects all pending commissions for that policy |
| `trg_audit_log_after_insert` | `audit_logs` | AFTER INSERT | Sends in-app notifications to admins/managers for key events |

### 4.5 Row-Level Security (RLS)

RLS is enabled on **all 25 tables**. Key patterns:

- **Service role key** bypasses RLS entirely (used by API routes via `supabaseAdmin`)
- **Users table**: All authenticated users can read; only admin can insert/delete; self or admin can update
- **Policies**: All can read/insert; admin/manager can update freely; employees restricted to unlocked policies assigned to them
- **Audit logs**: Append-only — insert allowed for all, select for admin/manager only, no update/delete
- **Notifications**: Admin/manager see all; employees see only their own; self can mark as read
- **Login attempts**: Write via SECURITY DEFINER RPCs only (prevents anon manipulation)

### 4.6 Indexes (~40)

All major query patterns are indexed including: foreign keys, status filters, date ranges, user lookups, composite indexes for common joins.

---

## 5. API Routes — Full Catalog

### 5.1 Health & System

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| GET | `/api/health` | None | None | Health check (Supabase connectivity test) |

### 5.2 Users (Admin Only)

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/users` | Admin | 5/min | Create user (Supabase Auth + DB profile) |
| PUT | `/api/users/[id]` | Admin | 30/min | Update user profile/role/status/password |
| DELETE | `/api/users/[id]` | Admin | 30/min | Delete user (Auth + DB cleanup) |

### 5.3 Policies

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/policies` | All roles | 30/min | Create policy (auto-generated number, employee lock) |
| PUT | `/api/policies/[id]` | All roles | 30/min | Update policy (lock-enforced for employees) |
| DELETE | `/api/policies/[id]` | Admin | 30/min | Hard-delete policy |
| POST | `/api/policies/[id]/lock` | Admin/Manager | 30/min | Toggle employee lock flag |
| POST | `/api/policies/[id]/verify` | All roles | 30/min | Submit verification checklist (immutable log) |

### 5.4 Customers

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/customers/auto-create` | All roles | 20/min | Find-or-create customer from OCR data |
| POST | `/api/customers/[id]/deactivate` | Admin | 10/min | Soft-delete + disable portal access |
| POST | `/api/customers/portal-access` | Admin | 30/min | Toggle portal login (enable/disable) |
| POST | `/api/customers/portal-password` | Admin | 30/min | Reset portal password (auto-generate) |
| POST | `/api/customers/create-portal-account` | Admin | 5/min | Create customer portal Supabase Auth user |

### 5.5 Email

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/email` | Admin/Manager | 10/min | Send email via template or custom HTML |
| POST | `/api/email/send-reminder` | All roles | 30/min | Send policy expiry / payment reminders |

### 5.6 Other

| Method | Route | Auth | Rate Limit | Purpose |
|--------|-------|------|------------|---------|
| POST | `/api/upload` | All roles | 30/min | Issue signed upload URL for Supabase Storage |
| POST | `/api/extract-pdf` | All roles | 10/min | Proxy to external PDF text-extraction API |
| POST | `/api/attendance/send-notification` | Admin/Manager | 30/min | Send attendance email + in-app notifications |

### 5.3 API Route Pattern

Every API route follows this consistent pattern:

```typescript
export async function POST(req: NextRequest) {
  // 1. Rate limit + CSRF protection
  const blocked = protect(req, { maxRequests: 30 });
  if (blocked) return blocked;

  // 2. Auth: verify JWT + check role
  const caller = await requireAuth(req, ["admin", "manager"]);
  if (isAuthError(caller)) return authError(caller);

  // 3. Parse + validate body
  const body = await req.json();

  // 4. Business logic (Supabase queries via supabaseAdmin)
  const { data, error } = await supabaseAdmin.from("table").insert(payload);

  // 5. Audit logging (best-effort)
  await supabaseAdmin.from("audit_logs").insert({ ... });

  // 6. Return response
  return NextResponse.json(data, { status: 201 });
}
```

---

## 6. Services Layer

The services layer (`lib/services/`) wraps Supabase queries into reusable functions. These are called from both API routes (server-side) and React hooks (client-side via browser Supabase client).

| Service | File Size | Key Functions |
|---------|-----------|---------------|
| `authService` | 1.5 KB | `loginWithEmail`, `logout`, `sendPasswordResetEmail`, `getAccessToken` |
| `policyService` | ~12 KB | `createPolicy`, `updatePolicy`, `deletePolicyWithCascade`, `getExpiryBuckets`, `getWeeklyExpiring`, `lockPolicyForEmployee`, `confirmPolicyVerification` |
| `customerService` | ~10 KB | `createCustomer`, `deleteCustomerWithCascade`, `bulkCreateCustomers`, `searchCustomers`, `createCustomerFromExtraction` |
| `emailService` | 33 KB | 11 email templates (welcome, expiry, payment, renewal, commission, late check-in, absent, early checkout, generic), retry with exponential backoff, bulk send |
| `commissionService` | ~5 KB | CRUD + commission rules management |
| `attendanceService` | ~5 KB | Check-in/out, holiday management, early checkout requests |
| `premiumService` | ~4 KB | Premium CRUD with status management |
| `renewalService` | ~4 KB | Renewal tracking and status updates |
| `documentService` | ~4 KB | Document metadata CRUD with storage cleanup |
| `notificationService` | ~3 KB | In-app notification CRUD + mark-as-read |
| `campaignService` | ~3 KB | Campaign CRUD + archive management |
| `dashboardService` | ~3 KB | Dashboard statistics and counts |
| `reportsService` | ~2 KB | Report generation queries |
| `auditLogService` | ~2 KB | Audit log reads + log action helper |
| `settingsService` | ~2 KB | System config CRUD |

---

## 7. Authentication & Authorization

### 7.1 Auth Flow

```
Login:
  Browser → supabase.auth.signInWithPassword(email, password)
    → Supabase GoTrue returns JWT + refresh token (stored in httpOnly cookies)
    → AuthProvider fetches user profile from users table
    → Checks: account active? login attempts exceeded?
    → Sets auth state → redirects to /dashboard

API Call:
  Browser → getAccessToken() → attaches Bearer token to request header
    → proxy.ts (Edge) → checks Bearer token exists
    → API route → requireAuth() → supabaseAdmin.auth.getUser(token)
      → Verifies JWT signature + expiry
      → Fetches user profile (role, branch_id)
      → Checks against allowedRoles
    → Business logic executes
```

### 7.2 Multi-Layer Auth

| Layer | Where | What |
|-------|-------|------|
| **Edge (proxy.ts)** | Before page render | Checks Bearer token exists for `/api/*` routes; security headers on all routes |
| **API Middleware** | In API route | `requireAuth()` — verifies JWT via Supabase Auth, fetches role, enforces role-based access |
| **Client-side** | AuthProvider | Session timeout with countdown, activity listeners, login attempt tracking/lockout |
| **Database** | PostgreSQL RLS | Per-table row-level policies enforce access even if API layer is bypassed |

### 7.3 RBAC Permission Matrix

Three roles with granular per-module permissions:

| Module | Admin | Manager | Employee |
|--------|-------|---------|----------|
| Dashboard | view | view | view |
| Customers | view, create, edit, delete, export | view, create, edit, export | view, create |
| Policies | view, create, edit, delete, export | view, create, edit, export | view, create |
| Renewals | view, create, edit, delete, export | view, create, edit, export | view |
| Premiums | view, create, edit, delete, export | view, create, edit, export | — |
| Attendance | view, create, edit, delete, export | view, create, edit, export | view, create, edit |
| Documents | view, create, edit, delete, export | view, create, edit, delete, export | view, create |
| Notifications | view, create, edit, delete, broadcast | view, edit, delete, broadcast | view, edit, delete |
| Campaigns | view, create, edit, delete, export | view, create, edit, export | — |
| Reports | view, export | view, export | — |
| Audit Logs | view, export | view, export | — |
| Archives | view, export | view, export, restore | view |
| Users | view, create, edit, delete | — | — |
| Settings | view, edit | — | — |

### 7.4 Session Management

- **Configurable timeout**: Default 30 minutes, settable via `system_config` (`session_timeout_minutes`)
- **Activity detection**: Mouse, keyboard, scroll, and touch events reset the timer
- **Countdown**: Shows a warning countdown in the last 60 seconds
- **Login lockout**: Configurable max attempts (default 5), 15-minute lockout period
- **Attempt tracking**: Via `login_attempts` table and SECURITY DEFINER RPCs

---

## 8. Security Layer

### 8.1 Security Headers

Applied by both `proxy.ts` (edge) and `next.config.ts`:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
X-DNS-Prefetch-Control: on
```

### 8.2 Rate Limiting

- **Algorithm**: In-memory sliding window with LRU eviction
- **Key**: Client IP from `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip`
- **Default**: 30 requests per 60-second window (configurable per route)
- **Tighter limits**: User creation (5/min), email dispatch (10/min), PDF extraction (10/min)
- **Response**: HTTP 429 with `Retry-After` and `X-RateLimit-*` headers
- **Max entries**: 10,000 (LRU eviction beyond that)
- **Cleanup**: Every 5 minutes, stale entries are purged

> **Note**: In-memory rate limiting works per-instance. For multi-instance deployments, replace with Upstash Redis.

### 8.3 CSRF Protection

- **Method**: Origin/Referer header validation (not token-based)
- **Why**: Bearer token APIs cannot be attacked by HTML form submissions
- **Allowed hosts**: `localhost:3000`, `localhost:3001`, `NEXT_PUBLIC_APP_URL`, Vercel system URLs
- **Fallback**: If no Origin/Referer present, allows requests with Authorization header

### 8.4 IP Whitelisting

- **Config**: `OFFICE_IP_WHITELIST` env var (comma-separated IPs)
- **Behavior**: If set, only listed IPs + localhost can access API routes
- **Response**: HTTP 403 with audit log entry

### 8.5 Input Validation

- All API inputs validated with **Zod schemas** (`lib/validations/`)
- 11 validation files covering all entity types
- Server-side validation only (client-side uses react-hook-form + same Zod schemas)
- HTML escaping in email templates to prevent XSS injection

### 8.6 Audit Logging

- Every significant action writes to `audit_logs` table
- Fields: `action`, `module`, `details`, `user_id`, `user_name`, `user_role`, `metadata` (JSONB)
- Blocked requests (IP restriction, rate limit, role denied) logged via `forbidden-logger.ts`
- Audit logs are append-only (no UPDATE/DELETE in RLS policy)

---

## 9. Realtime & Data Fetching

### 9.1 Realtime Architecture

A **single shared WebSocket channel** (`rt_global`) subscribes to `postgres_changes` on all 18 tables:

```typescript
// Simplified — see lib/hooks/use-realtime.ts
const channel = supabase.channel("rt_global");
for (const table of ALL_TABLES) {
  channel.on("postgres_changes", { event: "*", schema: "public", table }, callback);
}
channel.subscribe();
```

Components register callbacks per-table via `useRealtimeTable(table, callback)`. When a database change fires, the corresponding SWR cache is invalidated via `mutate()`, triggering a re-fetch.

### 9.2 Data Fetching Hooks

`useCollection<T>` and `useDoc<T>` (`lib/hooks/use-supabase-query.ts`) are the primary data-fetching hooks:

- **In-memory LRU cache**: 100 entries, 60s TTL — instant back-navigation
- **Fallback polling**: Every 5 minutes (Realtime handles instant updates)
- **Debounce**: 500ms on Realtime events to prevent cascade refetches
- **Error handling**: Auto-suspends polling after 3 consecutive errors
- **Tab awareness**: Pauses polling when tab is hidden
- **Field mapping**: Auto-converts camelCase ↔ snake_case

---

## 10. Email System

### 10.1 Configuration

```bash
SMTP_HOST=smtp.gmail.com   # Any SMTP server
SMTP_PORT=587               # 587 (STARTTLS) or 465 (SSL)
SMTP_USER=your@email.com
SMTP_PASS=app-password      # Gmail: use App Password with 2FA
SMTP_FROM="BP & AF Insurance <noreply@bpaf.in>"
```

### 10.2 Email Templates (11)

| Template | Trigger | Description |
|----------|---------|-------------|
| `welcome` | User creation | Welcome email with login link |
| `policyExpiryReminder` | Manual or pg_cron | Policy expiring soon (with days remaining) |
| `paymentReminder` | Manual | Premium payment due/overdue |
| `renewalConfirmation` | Manual | Renewal confirmed with new policy details |
| `commissionPayout` | Manual | Commission payout notification |
| `passwordReset` | Password change | Password reset confirmation |
| `lateCheckIn` | Attendance | Late check-in notice with minutes late |
| `absentReminder` | Manual | Absent employee reminder |
| `earlyCheckoutNotice` | Approval | Early checkout approved notification |
| `generic` | Any | Generic notification with optional CTA button |
| `custom` (API only) | Manual | Raw HTML/text email via `/api/email` |

### 10.3 Features

- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Bulk send**: Individual emails per recipient (no exposed recipient lists)
- **Custom templates**: Admin-configurable via `system_config` (replaces default HTML)
- **XSS prevention**: All template variables HTML-escaped
- **Fallback**: If SMTP not configured, emails logged to console (dev mode)

---

## 11. File Storage

### 11.1 Upload Flow

Files never pass through Next.js — only signed URL generation does:

```
1. Client → POST /api/upload { path: "policies/xxx.pdf", contentType: "application/pdf", fileSize: 12345 }
2. Server validates: MIME type whitelist, 10MB max, path traversal checks, allowed prefixes
3. Server generates signed upload URL via Supabase Storage
4. Server returns { uploadUrl, downloadUrl, token, storagePath }
5. Client → PUT uploadUrl (direct to Supabase Storage)
```

### 11.2 Allowed MIME Types

```
application/pdf, image/jpeg, image/png, image/webp, image/gif, image/bmp, image/tiff
```

### 11.3 Storage Buckets

| Prefix | Bucket | Usage |
|--------|--------|-------|
| `policies/` | `policies` | Policy PDFs |
| `documents/` | `documents` | General documents |
| `customers/` | `customers` | Customer files |
| `profiles/` | `profiles` | User avatars |
| `temp/` | `temp` | Temporary uploads |

---

## 12. Scheduled Jobs (pg_cron)

| # | Job | Schedule | What it does |
|---|-----|----------|--------------|
| 1 | mark-overdue-premiums | Daily 00:00 IST | Marks premiums past due date as `overdue` |
| 2 | mark-expired-policies | Daily 00:05 IST | Marks policies past `end_date` as `expired`, sends notifications |
| 3 | generate-renewal-reminders | Daily 08:00 IST | Auto-creates renewal records for policies expiring within N days (configurable), sends notifications at 30/15/7 day marks |
| 4 | auto-mark-absent | Mon–Sat 19:00 IST | Auto-checkouts unclosed attendance, marks as absent (skips holidays), cleans old notifications |
| 5 | weekly-aggregation | Sunday 23:30 IST | Branch-level stats: new policies, premiums collected, commissions paid, attendance rate |
| 6 | monthly-report | End of month | Comprehensive report: policy, premium, commission, renewal, and customer stats (JSONB) |

---

## 13. CI/CD Pipeline

**`.github/workflows/ci.yml`** — 4-stage pipeline on push/PR to `main`:

```
┌───────────────┐
│  Lint & Types  │  → eslint + tsc --noEmit
└───────┬───────┘
        │
┌───────▼───────┐     ┌───────────────┐
│    Tests       │     │ Security Audit │  → npm audit --audit-level=high
│  vitest + cov  │     └───────┬───────┘
└───────┬───────┘             │
        │                     │
        └──────────┬──────────┘
                   │
           ┌───────▼───────┐
           │     Build      │  → next build (with env secrets)
           └───────────────┘
```

- **Concurrency**: Cancels stale runs on the same branch
- **Node**: v20 with npm caching
- **Test coverage**: V8 provider with verbose reporting

---

## 14. Current Deployment

```
┌─────────────────────────────────────────┐
│           Vercel (bom1 = Mumbai)        │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Next.js App  │  │ Serverless Fns   │  │
│  │ (SSR/SSG)    │  │ (API Routes)     │  │
│  └─────────────┘  └──────────────────┘  │
└─────────────────────┬───────────────────┘
                      │
         ┌────────────▼────────────┐
         │   Supabase Cloud        │
         │   (PostgreSQL + Auth    │
         │    + Storage + Realtime)│
         └─────────────────────────┘
```

**Config** (`vercel.json`):
- Region: `bom1` (Mumbai)
- Framework: Next.js
- API headers: `Cache-Control: no-store`
- Static assets: 1-year immutable cache

---

## 15. Local Development Setup — Docker + PostgreSQL

### 15.1 Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Docker Desktop** | 4.x+ | Container runtime |
| **Docker Compose** | v2 (included in Docker Desktop) | Multi-container orchestration |
| **Node.js** | 20+ | Next.js runtime |
| **npm** | 10+ | Package manager |
| **Git** | 2.x+ | Source control |

### 15.2 Option A: Supabase CLI (Recommended — Zero Code Changes)

This approach runs the full Supabase stack locally. **No code changes required** — everything works identically to production.

#### Step 1: Install Supabase CLI

```bash
# Windows (PowerShell)
npx supabase --version   # checks if already installed

# Or install globally
npm install -g supabase
```

#### Step 2: Initialize Supabase locally

```bash
cd e:\BAPF-WORK\bapf

# Initialize (creates supabase/ config if not present)
npx supabase init

# Start local Supabase (pulls Docker images: ~2GB first time)
npx supabase start
```

This starts these Docker containers:

| Container | Port | Service |
|-----------|------|---------|
| supabase-db | 54321 (API), 54322 (DB) | PostgreSQL 15 |
| supabase-auth | 54321 | GoTrue (Auth) |
| supabase-storage | 54321 | Storage (S3-compatible) |
| supabase-realtime | 54321 | Realtime WebSocket |
| supabase-studio | 54323 | Dashboard UI |
| supabase-inbucket | 54324 | Email testing inbox |
| supabase-kong | 54321 | API Gateway |

After `supabase start`, you'll see output like:

```
API URL:          http://127.0.0.1:54321
GraphQL URL:      http://127.0.0.1:54321/graphql/v1
DB URL:           postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL:       http://127.0.0.1:54323
Inbucket URL:     http://127.0.0.1:54324
anon key:         eyJ...
service_role key: eyJ...
```

#### Step 3: Run database migrations

```bash
# Apply all migrations
npx supabase db reset

# This runs:
# 1. All files in supabase/migrations/ (001 through 011)
# 2. supabase/seed.sql (demo data)
```

#### Step 4: Configure environment variables

Create `.env.local`:

```bash
# Supabase Local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase start output>

# App
NEXT_PUBLIC_APP_NAME=BP & AF Insurance Broker
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30
NEXT_PUBLIC_APP_URL=http://localhost:3000

# SMTP (use Inbucket for local testing — no real emails sent)
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_USER=test
SMTP_PASS=test
SMTP_FROM="BAPF <test@localhost>"

# Optional: disable IP whitelist for local dev
OFFICE_IP_WHITELIST=
```

#### Step 5: Install dependencies and run

```bash
npm install
npm run dev
```

#### Step 6: Access

| Service | URL | Credentials |
|---------|-----|-------------|
| **App** | http://localhost:3000 | admin@bpaf.com / Admin@123456 |
| **Supabase Studio** | http://127.0.0.1:54323 | (no auth needed locally) |
| **Inbucket (emails)** | http://127.0.0.1:54324 | (view sent emails) |

#### Test credentials (from seed data):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bpaf.com | Admin@123456 |
| Manager | manager@bpaf.com | Manager@123456 |
| Employee | rahul@bpaf.com | Employee@123456 |
| Employee | priya@bpaf.com | Employee@123456 |

---

### 15.3 Option B: Docker Compose with Self-Hosted Supabase (Full Control)

For full control over the infrastructure, use the official Supabase self-hosted Docker Compose.

#### Step 1: Clone Supabase Docker

```bash
# In a separate directory from the BAPF project
cd e:\BAPF-WORK
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

#### Step 2: Configure `.env`

Edit `supabase/docker/.env`:

```bash
# Generate new keys at: https://supabase.com/docs/guides/self-hosting#api-keys
POSTGRES_PASSWORD=your-super-secret-postgres-password
JWT_SECRET=your-super-secret-jwt-token-at-least-32-chars
ANON_KEY=<generated-anon-key>
SERVICE_ROLE_KEY=<generated-service-role-key>

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=admin

# Ports
KONG_HTTP_PORT=8000
STUDIO_PORT=3001
```

#### Step 3: Start Supabase

```bash
docker compose up -d
```

#### Step 4: Run BAPF migrations

```bash
cd e:\BAPF-WORK\bapf

# Option A: Use the built-in db:push script
# Set the DB password in .env.local:
# SUPABASE_DB_PASSWORD=your-super-secret-postgres-password
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
npm run db:push

# Option B: Connect directly with psql
psql postgresql://postgres:your-password@localhost:5432/postgres \
  -f supabase/migrations/001_initial_schema.sql
psql postgresql://postgres:your-password@localhost:5432/postgres \
  -f supabase/migrations/002_customer_portal_users.sql
# ... repeat for all migration files ...
psql postgresql://postgres:your-password@localhost:5432/postgres \
  -f supabase/seed.sql
```

#### Step 5: Configure BAPF `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-generated-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-generated-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 15.4 Option C: Plain PostgreSQL + Docker (Minimal — Requires Code Changes)

If you only want PostgreSQL without the full Supabase stack, **significant code changes are needed** to replace Supabase Auth, Storage, and Realtime. This is **NOT recommended** unless you have a specific reason.

#### What you'd need to replace:

| Supabase Feature | Replacement Needed |
|------------------|--------------------|
| Auth (GoTrue) | JWT library + bcrypt + sessions table |
| Storage | MinIO or local filesystem with signed URL logic |
| Realtime | Server-Sent Events or WebSocket server |
| RLS Policies | Application-level middleware checks |

#### PostgreSQL-only Docker Compose:

```yaml
# docker-compose.yml (minimal)
version: "3.8"
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: bapf
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localdev123
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

> **Warning**: This approach requires rewriting the auth system, storage upload system, and realtime subscriptions. Estimated effort: 2-4 weeks. Use Option A or B instead.

---

### 15.5 Technology Requirements Summary

| Requirement | Option A (Supabase CLI) | Option B (Self-Hosted) | Option C (Plain PG) |
|-------------|-------------------------|------------------------|----------------------|
| Docker | Required | Required | Required |
| Docker images | ~2 GB (auto-pulled) | ~3 GB | ~400 MB |
| RAM usage | ~2 GB | ~3 GB | ~512 MB |
| Code changes | **None** | **None** | **Major** (2-4 weeks) |
| Supabase Auth | Included | Included | Must replace |
| Storage | Included (local) | Included | Must replace (MinIO) |
| Realtime | Included | Included | Must replace (SSE/WS) |
| pg_cron | Included | Must enable | Must install extension |
| Studio UI | Included (:54323) | Included (:3001) | pgAdmin or DBeaver |
| Email testing | Inbucket included | Inbucket included | Mailhog or similar |
| Difficulty | Easy | Medium | Hard |
| Setup time | ~15 minutes | ~30 minutes | 2-4 weeks |

---

### 15.6 Stopping & Cleaning Up

```bash
# Option A: Supabase CLI
npx supabase stop          # Stop containers (data preserved)
npx supabase stop --no-backup # Stop and delete all data

# Option B: Docker Compose
cd supabase/docker
docker compose down        # Stop containers (data preserved)
docker compose down -v     # Stop and delete all data

# Check running containers
docker ps
```

---

### 15.7 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 54321 in use | Stop other Supabase instances or change port in `supabase/config.toml` |
| Migrations fail with "already exists" | Run `npx supabase db reset` to start fresh |
| pg_cron not available | pg_cron requires Supabase (not plain Postgres). Use Option A or B |
| Auth not working | Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches the key from `supabase start` |
| Storage uploads fail | Ensure Storage container is running: `docker ps | grep storage` |
| Realtime not connecting | Check WebSocket URL matches `NEXT_PUBLIC_SUPABASE_URL` |
| `NODE_OPTIONS=--max-old-space-size=8192` | The dev script allocates 8GB for Turbopack. Reduce if your machine has less RAM |
| Windows path issues | Use forward slashes in Docker volume mounts |

---

## 16. Quick Reference & Cheatsheet

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key (server-only) |
| `NEXT_PUBLIC_APP_NAME` | No | BP & AF Insurance Broker | App display name |
| `NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES` | No | 30 | Session timeout minutes |
| `NEXT_PUBLIC_APP_URL` | No | — | Production URL (for CORS/CSRF) |
| `SMTP_HOST` | No | — | SMTP server host |
| `SMTP_PORT` | No | 587 | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |
| `SMTP_FROM` | No | — | From address for emails |
| `OFFICE_IP_WHITELIST` | No | — | Comma-separated IP whitelist |
| `SENTRY_AUTH_TOKEN` | No | — | Sentry source map upload |
| `SENTRY_ORG` | No | — | Sentry organization |
| `SENTRY_PROJECT` | No | — | Sentry project name |
| `NEXT_PUBLIC_SENTRY_DSN` | No | — | Sentry DSN for error tracking |
| `SUPABASE_DB_PASSWORD` | No | — | Direct DB password (for db:push) |

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000, Turbopack, 8GB heap) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run analyze` | Bundle analyzer (generates visual report) |
| `npm run db:push` | Run database migrations + seed via direct PostgreSQL connection |

### Key File Paths

| Purpose | Path |
|---------|------|
| Edge middleware | `proxy.ts` |
| API auth middleware | `lib/api/auth-middleware.ts` |
| Rate limit + CSRF | `lib/api/protect.ts` |
| Browser Supabase client | `lib/supabase/client.ts` |
| Server Supabase client | `lib/supabase/server.ts` |
| Database types | `lib/supabase/database.types.ts` |
| Permission matrix | `lib/permissions.ts` |
| Full database schema | `supabase/migrations/001_initial_schema.sql` |
| Seed data | `supabase/seed.sql` |
| Auth context | `lib/context/auth-context.tsx` |
| Realtime hook | `lib/hooks/use-realtime.ts` |
| Data fetching hooks | `lib/hooks/use-supabase-query.ts` |
| Email templates | `lib/services/email.service.ts` |
| Environment template | `.env.example` |

---

*End of report. For deployment-specific guides, see also:*
- `docs/self-hosted-deployment-guide.md`
- `docs/open-source-self-hosted-guide.md`
- `docs/gaming-pc-server-deployment-guide.md`
- `docs/india-compliance-deployment-guide.md`
