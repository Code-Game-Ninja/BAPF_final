# Project Folder Structure

> Last updated: May 2026 — reflects the current state of the BAPF CRM project.

## Root Directory

```
bapf/
├── .agents/                    # Agent rules and workflow configs (Kiro/AI)
├── .github/                    # GitHub Actions CI/CD workflows
├── .kiro/                      # Kiro specs and steering files
├── .vscode/                    # VS Code workspace settings
├── app/                        # Next.js App Router (pages + API routes)
├── components/                 # Reusable React components
├── docs/                       # Project documentation
├── e2e/                        # End-to-end tests (Playwright)
├── lib/                        # Shared libraries, services, hooks, types
├── public/                     # Static assets served at /
├── scripts/                    # Utility and migration scripts
├── supabase/                   # Supabase migrations, seed, config
├── tests/                      # Unit and integration tests (Vitest)
└── utils/                      # Low-level utility helpers
```

---

## `/app` — Next.js App Router

```
app/
├── api/                        # API route handlers
│   ├── attendance/             # Attendance tracking + auto-absent
│   ├── claims/                 # Insurance claims CRUD
│   ├── communications/         # Messaging, templates, send
│   ├── customers/              # Customer CRUD, portal, KYC
│   ├── email/                  # Email sending, KYC reminders
│   ├── endorsements/           # Policy endorsements
│   ├── extract-pdf/            # PDF extraction (sync + background)
│   ├── fleet/                  # Fleet insurance by customer
│   ├── gmc/                    # Group Medical Cover by customer
│   ├── health/                 # Health check endpoint
│   ├── invoices/               # Invoice management
│   ├── irda/                   # IRDA compliance data
│   ├── kyc/                    # KYC document management
│   ├── leads/                  # Sales leads
│   ├── policies/               # Policy CRUD + stats
│   ├── proposals/              # Proposal management
│   ├── reports/                # Report generation (attendance etc.)
│   ├── service-desk/           # Tickets, SLA, templates, metrics
│   ├── sop/                    # Standard Operating Procedures
│   ├── upload/                 # File upload handler
│   ├── users/                  # User management
│   └── v1/                     # Versioned public API (customers, activity-logs)
│
├── dashboard/                  # Authenticated dashboard pages
│   ├── archives/               # Archived records
│   ├── attendance/             # Attendance management
│   ├── audit-logs/             # System audit trail
│   ├── business-cases/         # Business case tracker
│   ├── campaigns/              # Marketing campaigns
│   ├── claims/                 # Claims management
│   ├── commissions/            # Commission tracking
│   ├── communications/         # Internal communications
│   ├── customers/              # Customer registry
│   ├── documents/              # Document management
│   ├── endorsements/           # Endorsement management
│   ├── fleet/                  # Fleet insurance dashboard
│   ├── gmc/                    # Group Medical Cover dashboard
│   ├── intake/                 # New business intake wizard
│   ├── invoices/               # Invoice management
│   ├── irda/                   # IRDA reporting
│   ├── kyc/                    # KYC verification
│   ├── monitoring/             # System monitoring
│   ├── notifications/          # Notification center
│   ├── performance/            # Team performance
│   ├── policies/               # Policy management
│   ├── premiums/               # Premium tracking
│   ├── profile/                # User profile
│   ├── proposals/              # Proposal management
│   ├── renewals/               # Policy renewals
│   ├── reports/                # Reports and analytics
│   ├── sales-leads/            # Sales pipeline
│   ├── service-desk/           # Service desk / ticketing
│   ├── settings/               # App settings
│   ├── sop/                    # SOP viewer
│   ├── team/                   # Team management
│   └── users/                  # User administration
│
├── login/                      # Login page
├── globals.css                 # Global styles
├── layout.tsx                  # Root layout
└── page.tsx                    # Root redirect
```

---

## `/components` — React Components

```
components/
├── attendance/                 # Attendance UI components
├── audit-logs/                 # Audit log viewer
├── auth/                       # Auth guards, login form
├── claims/                     # Claims forms and tables
├── commissions/                # Commission views
├── customers/                  # Customer forms, registry, KYC
├── dashboard/                  # Dashboard widgets, charts
├── documents/                  # Document upload/viewer
├── endorsements/               # Endorsement forms
├── fleet/                      # Fleet management UI
├── global/                     # Sidebar, navbar, shared layout
├── gmc/                        # GMC management UI
├── invoices/                   # Invoice forms and tables
├── kyc/                        # KYC document components
├── layouts/                    # Page layout wrappers
├── policies/                   # Policy forms and tables
├── premiums/                   # Premium tracking UI
├── proposals/                  # Proposal forms
├── renewals/                   # Renewal management UI
├── reports/                    # Report components
├── sales-leads/                # Lead management UI
├── service-desk/               # Ticket and SLA components
├── ui/                         # Base UI primitives (shadcn/ui)
├── users/                      # User management UI
├── error-boundary.tsx          # Global error boundary
├── swr-provider.tsx            # SWR cache provider
└── theme-provider.tsx          # Dark/light theme provider
```

---

## `/lib` — Shared Libraries

```
lib/
├── api/                        # API client helpers
├── context/                    # React context providers
├── helpers/                    # Business logic helpers (PDF, etc.)
├── hooks/                      # Custom React hooks
├── monitoring/                 # Performance and error monitoring
├── security/                   # Auth, IP whitelist, rate limiting
├── services/                   # Data access services (Supabase queries)
├── sla/                        # SLA calculation logic
├── supabase/                   # Supabase client + generated DB types
├── tickets/                    # Service desk ticket logic
├── types/                      # Shared TypeScript types
├── utils/                      # General utility functions
├── validation/                 # Zod schemas and validators
├── validations/                # Additional validation helpers
├── workers/                    # Background job workers
└── permissions.ts              # Role-based permission definitions
```

---

## `/scripts` — Utility Scripts

```
scripts/
├── debug/                      # One-off debug scripts
├── deployment/                 # Deployment automation
├── db-push.mjs                 # Push schema to Supabase
├── db-clear.mjs                # Clear all data (dev only)
├── run-migrations.mjs          # Run SQL migrations by phase
├── migrate-phase-1.sql         # Phase 1 schema migrations
├── migrate-phase-2.sql         # Phase 2 schema migrations
├── migrate-phase-3.sql         # Phase 3 schema migrations
├── migrate-phase-4.sql         # Phase 4 schema migrations
├── dev-local.js                # Local dev helper
└── dedup.ts                    # Data deduplication script
```

---

## `/supabase` — Database

```
supabase/
├── migrations/                 # Ordered SQL migration files
├── seed.sql                    # Dev seed data
└── clear-data.sql              # Dev data wipe script
```

---

## `/tests` — Unit & Integration Tests

```
tests/
├── api/                        # API route tests
├── components/                 # Component tests
├── flows/                      # User flow tests
├── functions/                  # Utility function tests
├── hooks/                      # Custom hook tests
├── integration/                # Integration tests
├── monitoring/                 # Monitoring tests
├── phase1/ … phase3/           # Phase-specific regression tests
├── security/                   # Auth and security tests
├── services/                   # Service layer tests
├── utils/                      # Utility tests
└── setup.ts                    # Vitest global setup
```

---

## `/docs` — Documentation

```
docs/
├── deployment/                 # Deployment guides
├── fixes/                      # Fix notes and changelogs
├── production/                 # Production runbooks
├── project-status/             # Historical status snapshots
├── API.md                      # API reference
├── backend-deep-dive-report.md # Architecture deep dive
└── FOLDER_STRUCTURE.md         # This file
```

---

## Root Config Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | TypeScript configuration |
| `next.config.mjs` | Next.js configuration |
| `next.config.ts` | Next.js configuration (TS variant) |
| `vercel.json` | Vercel deployment config |
| `playwright.config.ts` | E2E test configuration |
| `vitest.config.ts` | Unit test configuration |
| `eslint.config.mjs` | ESLint rules |
| `postcss.config.mjs` | PostCSS / Tailwind config |
| `components.json` | shadcn/ui component config |
| `instrumentation.ts` | OpenTelemetry / Sentry setup |
| `sentry.*.config.ts` | Sentry client/server/edge configs |
| `Dockerfile` | Container build definition |
| `.env.example` | Environment variable template |

---

## Gitignored Directories (not committed)

| Directory | Reason |
|-----------|--------|
| `node_modules/` | npm dependencies |
| `.next/` | Next.js build output |
| `.venv/` | Python virtual environment |
| `logs/` | Runtime application logs |
| `scratch/` | Temporary dev workspace |
| `graphify-out/` | AI graph analysis output |
| `test-results/` | Vitest/Playwright run results |
| `playwright-report/` | Playwright HTML reports |
| `supabase/.temp/` | Supabase CLI temp files |
| `.vercel/` | Vercel deployment metadata |

---

## Conventions

- **Directories**: `kebab-case`
- **React components**: `PascalCase.tsx`
- **Utilities / hooks / services**: `camelCase.ts` or `kebab-case.ts`
- **API routes**: `route.ts` inside feature folder
- **Types**: co-located in `lib/types/` or alongside the feature
- **Tests**: mirror the source structure inside `tests/`
