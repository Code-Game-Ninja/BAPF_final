# GitHub Copilot Instructions

most important instructions for every request.
dont try to do whole work at once. as per your token limit, ask me for next prompt when you reach your limit.


---

## [CRITICAL] - READ FIRST

### No Emojis - Use React Icons
- **NEVER** use emojis in **code logic**, **component JSX**, or **static UI elements**
- **ALWAYS** use icons from `lucide-react` library instead for UI elements
- **EXCEPTION:** User-generated content (UGC) CAN contain emojis:
  - Mock data simulating user posts, comments, messages
  - Content that would come from a database/API in production
- This applies to:
  - React components and JSX (use icons, not emojis)
  - Static data files (use icons, not emojis)
  - User-generated mock content (emojis are OK here)
- **Examples:**
  - Instead of `📋` in a policy badge, use `<FileText />` from lucide-react
  - Instead of `✅` in a status component, use `<CheckCircle />` from lucide-react

### Token Limit Awareness
- **DO NOT** attempt to complete entire features, large files, or complex tasks in a single response
- AI models have token generation limits (typically 4,000-8,000 tokens per response)
- When approaching the limit, **STOP and ask for the next prompt** instead of cutting off work
- **Break down large tasks** into smaller, manageable chunks:
  - Create one file at a time
  - Implement one component or feature per prompt
  - Split large refactoring into multiple steps
  - Build incrementally rather than monolithically

### Best Practices for Large Tasks
1. **Plan First:** Ask user for confirmation before starting
2. **Chunk Work:** Break into logical, independent steps
3. **Communicate Progress:** Report what's done and what's pending
4. **Ask for Next Steps:** After completing a chunk, ask "What should I work on next?"
5. **Avoid Truncation:** Never cut off or use "..." to indicate omitted code

### Incremental File Creation (MANDATORY for Large Files)
- **NEVER** try to create an entire file in one response
- **ALWAYS** follow this step-by-step approach:
  1. **Step 1 - Imports & Setup:** Create file with all imports, types/interfaces, and constants
  2. **Step 2 - Core Components:** Add main component structure and state
  3. **Step 3 - Sub-components:** Add helper components one by one
  4. **Step 4 - Logic & Handlers:** Add event handlers, API calls, effects
  5. **Step 5 - Review & Fix:** Review for errors, run dev server, fix any issues
- **After each step:** check your token limit and ask for user prompt to continue to next step if needed
- **Example workflow:**
  ```
  User: "Create PolicyDetailPage"
  AI: Creates file with imports, types, mock data → "Step 1 done. Say 'next' for Step 2"
  User: "next"
  AI: Adds main component structure → "Step 2 done. Say 'next' for Step 3"
  ... and so on
  ```

### Request Efficiency (Limited Requests)
- **IMPORTANT:** User has limited copilot requests
- **IF user provides 2-3 tasks in ONE prompt AND you have token capacity remaining:**
  - **DO NOT STOP** - Continue working through all tasks in the same response
  - Complete all tasks if they fit within token limits
  - Only ask for next prompt if you approach token limit
- **Use requests efficiently:** Complete multiple small tasks per request to maximize value

### Terminal Input Instructions
- **IMPORTANT:** When running terminal commands that require user input (e.g., prompts, confirmations, selections):
  - **Provide the expected input in the chat message** before or after the command
  - **Example:** "Run `npm init` and enter: project-name, 1.0.0, description..."
  - If input is needed mid-execution, **pause and ask user** what to enter
  - Never assume default values without asking

### Auto-Run Server & Fix Errors
- **IMPORTANT:** After making code changes, ALWAYS:
  1. Kill existing dev server process (if any)
  2. Run `npm run dev` to start the development server
  3. Check for any compile/build errors in terminal output
  4. Fix any errors found before reporting completion
  5. Verify the app loads successfully (200 status)
- This is a standard step - no need for user to request it each time

### Example Workflow
```
User: "Create a complete policy renewal system"
Copilot: "I'll help with this in steps. Should I start with:
  1. Create renewal types/interfaces?
  2. Build the renewal service and hooks?
  3. Create RenewalListPage component?
  4. Create RenewalDetailPage component?

Which would you like me to start with?"
```

---

## Project Overview
**BAPF** (BP & AF Insurance Broker Pvt. Ltd.) is an **Insurance Operations Management Platform** - a full-stack internal dashboard for managing the day-to-day operations of an insurance brokerage firm. It replaces a previous Firebase-based system with a modern Supabase-powered architecture.

### Key Capabilities
- **Policy Management** across 12 insurance types with auto-numbering & verification workflows
- **Customer CRM** with portal access, bulk import, and soft-delete
- **Renewal Tracking** with calendar view and email reminders
- **Premium Collection** tracking with charts and period-based analysis
- **Commission Engine** with tiered rules per insurer and policy type
- **Sales Lead Management** with full lifecycle, scoring, and conversion
- **Employee Attendance** with check-in/out, early checkout approval, auto-checkout
- **Document Management** with Supabase Storage integration
- **Campaign Tracking** with ROI measurement
- **Audit Logging** for every action across all modules
- **Settings-Driven Behavior** (40+ configurable settings via `system_config`)
- **Role-Based Access Control** (admin, manager, employee)

### Default Configuration
- Currency: **PKR** (Pakistani Rupees), configurable for INR, USD, EUR, GBP, AED, SAR
- Deployment region: Vercel `bom1` (Mumbai)
- Dark mode default, system-aware theme switching

---

## Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.6 | React Framework with App Router, Turbopack |
| **React** | 19.2.3 | UI Library with concurrent features |
| **TypeScript** | ^5 | Type safety, strict mode enabled |
| **Tailwind CSS** | ^4 | Utility-first CSS (v4 with PostCSS plugin) |

### UI / Component Library
| Technology | Version | Purpose |
|------------|---------|---------|
| **shadcn/ui** | Latest | Accessible component library (New York style, Radix UI based) |
| **Lucide React** | ^0.563.0 | Tree-shakable icon set |
| **Framer Motion** | ^12.34.0 | Performant animations |
| **next-themes** | ^0.4.6 | Dark/light theme switching |
| **sonner** | ^2.0.7 | Toast notifications |
| **cmdk** | ^1.1.1 | Command palette (Cmd+K search) |
| **Recharts** | ^3.7.0 | Dashboard charts & data visualization |
| **class-variance-authority** | ^0.7.1 | Variant styling (CVA) |
| **clsx** + **tailwind-merge** | ^2.1.1 / ^3.4.0 | Class merging utilities |

### Backend / Database
| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase** (Auth + Postgres + Storage + Realtime) | Latest | All-in-one backend, self-hosted Docker for dev |
| **@supabase/supabase-js** | ^2.99.1 | Supabase JS client |
| **@supabase/ssr** | ^0.9.0 | Supabase SSR/cookie auth |
| **PostgreSQL** (via Supabase) | 16+ | Primary database with RLS, enums, RPC functions |
| **nodemailer** | ^8.0.1 | Email sending (SMTP) for reminders & notifications |

### State Management & Data Fetching
| Technology | Version | Purpose |
|------------|---------|---------|
| **SWR** | ^2.4.0 | Client-side data fetching/caching with revalidation |
| Custom `useCollection`/`useDoc` hooks | N/A | Primary data layer (Supabase queries + LRU cache + Realtime) |

### Forms & Validation
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Hook Form** | ^7.71.1 | Performance-focused form handling |
| **@hookform/resolvers** | ^5.2.2 | Schema resolvers for RHF |
| **Zod** | ^4.3.6 | TypeScript-first schema validation |

### File Handling & Export
| Technology | Version | Purpose |
|------------|---------|---------|
| **pdf-lib** | ^1.17.1 | PDF generation |
| **xlsx** | ^0.18.5 | Excel export/import |
| **papaparse** | ^5.5.3 | CSV parsing (bulk import) |
| **browser-image-compression** | ^2.0.2 | Client-side image compression |

### Date Handling
| Technology | Version | Purpose |
|------------|---------|---------|
| **date-fns** | ^4.1.0 | Date formatting & manipulation |
| **react-day-picker** | ^9.13.2 | Calendar date picker component |

### Monitoring & Analytics
| Technology | Version | Purpose |
|------------|---------|---------|
| **@sentry/nextjs** | ^10.38.0 | Error tracking & real-time alerts |
| **@vercel/analytics** | ^1.6.1 | Usage analytics & Web Vitals |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vitest** | ^4.0.18 | Unit/integration tests |
| **@testing-library/react** | ^16.3.2 | React component testing |
| **@testing-library/jest-dom** | ^6.9.1 | DOM matchers |
| **@testing-library/user-event** | ^14.6.1 | User interaction simulation |
| **Playwright** | ^1.58.2 | E2E testing (Chromium) |
| **jsdom** | ^28.0.0 | Test environment |

### Build & Dev Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| **@next/bundle-analyzer** | ^16.1.6 | Bundle size analysis (`ANALYZE=true`) |
| **cross-env** | ^10.1.0 | Cross-platform env vars |
| **concurrently** | ^9.2.1 | Run multiple scripts in parallel |
| **tsx** | ^4.21.0 | TypeScript execution for scripts |

### Infrastructure
| Service | Purpose |
|---------|---------|
| **Vercel** | Hosting, edge functions (region: `bom1` Mumbai) |
| **Supabase Cloud** | Managed Postgres, Auth, Storage, Realtime |
| **Supabase Docker** | Self-hosted local dev stack |
| **GitHub Actions** | CI/CD pipeline |

---

## Build, Test, and Lint Commands

```bash
# Development
npm install
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npx tsc --noEmit         # Type checking
npm run db:push          # Push DB migrations

# Testing - Vitest
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Single test file
npx vitest run tests/services/policy.service.test.ts

# Single test by name
npx vitest run -t "role enforcement"

# E2E - Playwright
npx playwright test
npx playwright test e2e/critical-flow.spec.ts
npx playwright test e2e/critical-flow.spec.ts -g "Login with valid credentials"
```

### Required Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-side only)
NEXT_PUBLIC_APP_NAME           # App display name
NEXT_PUBLIC_APP_URL            # App URL
SESSION_TIMEOUT_MINUTES        # Session timeout (default: 30)
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  # Email config
OFFICE_IP_WHITELIST            # Optional IP whitelist (comma-separated)
SENTRY_DSN                     # Sentry error tracking
```

---

## Code Style & Conventions

### JavaScript/TypeScript
- **Formatter:** Prettier with semicolons enabled
- **Linter:** ESLint with `next/core-web-vitals` + `next/typescript`
- **Indentation:** 2 spaces (never tabs)
- **Variables:** Use `const` by default, `let` when reassignment needed, avoid `var`
- **Naming:**
  - `camelCase` for variables, functions, and properties
  - `PascalCase` for class names and React components
  - `UPPER_SNAKE_CASE` for constants
  - Prefix boolean variables with `is`, `has`, `should`, `can`
- **Imports:** Use `@/` absolute imports (project-root alias from `tsconfig`)
- **`@typescript-eslint/no-explicit-any`:** warn (avoid but tolerated during migration)
- **`@typescript-eslint/no-unused-vars`:** warn (prefix unused with `_`)

### Example:
```typescript
// ✓ Good
const isUserActive = true;
const MAX_LOGIN_ATTEMPTS = 5;
class PolicyService {}
function calculatePremiumTotal() {}
import { Button } from '@/components/ui/button';

// ✗ Bad
const is_user_active = true;
const maxAttempts = 5;
class policy_service {}
import { Button } from '../../components/ui/button';
```

### React Components
- **Functional Components:** Always use functional components with hooks
- **File Naming:** kebab-case for component files (e.g., `policy-form.tsx`) — matches Next.js/shadcn convention
- **Props Interface:** Define clear interfaces/types for props
- **Hooks:** Place at top of component, group related hooks together
- **Prop Drilling:** Avoid deep prop drilling; use Context API or SWR for shared state

### CSS/Styling
- **Utility-First:** Use Tailwind CSS utility classes
- **Responsive Design:** Mobile-first approach with Tailwind breakpoints
- **Dark Mode:** Support dark mode via `next-themes` with `class` attribute strategy
- **Color Space:** `oklch` color space for CSS variables (defined in `globals.css`)
- **shadcn/ui Style:** New York variant, neutral base color, CSS variables enabled

### Theme
- Dark mode default, system-aware via `next-themes`
- Full light/dark CSS variable system in `globals.css` using `oklch` color space
- Custom theme tokens: `card-elevated`, `border-strong`, `skeleton`, chart colors (1-5), sidebar tokens
- Fonts: **Quicksand** (primary, weights 300-700), **Cabin** (heading/mono, weights 400-700)

### Database Conventions
- **Tables:** `snake_case` plural (e.g., `users`, `policies`, `commission_rules`, `audit_logs`)
- **Fields:** `snake_case` (e.g., `user_id`, `created_at`, `policy_number`)
- **Frontend types:** `camelCase` with normalization via `useCollection`/`useDoc` hooks (e.g., `created_at` → `createdAt`)
- **IDs:** UUID via `uuid-ossp` extension, always indexed
- **Soft deletes:** Use `deleted_at`/`deleted_by` fields (not physical deletion)

---

## Project Architecture

### Directory Structure
```
bapf/
├── app/                           # Next.js 16 App Router
│   ├── layout.tsx                 # Root layout (providers: Theme, Auth, SWR, Tooltip, Toaster)
│   ├── page.tsx                   # Root page (redirects via proxy)
│   ├── globals.css                # Tailwind v4 + shadcn CSS variables
│   ├── login/page.tsx             # Login page
│   ├── global-error.tsx           # Global error boundary
│   ├── not-found.tsx              # 404 page
│   ├── api/                       # API routes (server-side)
│   │   ├── health/route.ts        # Health check (public)
│   │   ├── policies/route.ts      # Policy CRUD
│   │   ├── policies/[id]/         # Policy detail + lock + verify
│   │   ├── leads/route.ts         # Lead CRUD
│   │   ├── leads/[id]/            # Lead detail + timeline + documents
│   │   ├── customers/             # Customer CRUD + auto-create + portal
│   │   ├── users/route.ts         # User management
│   │   ├── upload/route.ts        # File upload to Supabase Storage
│   │   ├── extract-pdf/route.ts   # PDF text extraction
│   │   ├── email/route.ts         # Send email + reminders
│   │   └── attendance/            # Attendance notifications
│   └── dashboard/                 # Protected dashboard routes
│       ├── layout.tsx             # Dashboard layout (sidebar + navbar + content)
│       ├── page.tsx               # Main dashboard
│       ├── archives/              # Archived records
│       ├── attendance/            # Attendance management
│       ├── audit-logs/            # Audit trail
│       ├── campaigns/             # Marketing campaigns
│       ├── commissions/           # Commission management
│       ├── customers/             # Customer management + credentials
│       ├── documents/             # Document management
│       ├── notifications/         # Notification center
│       ├── policies/              # Policy management + expiry + weekly views
│       ├── premiums/              # Premium tracking
│       ├── renewals/              # Renewal tracking
│       ├── reports/               # Report charts
│       ├── sales-leads/           # Sales lead management
│       ├── settings/              # App settings (admin only)
│       ├── users/                 # User management (admin only)
│       └── profile/               # User profile
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui primitives (26 components)
│   ├── attendance/                # Attendance module components
│   ├── audit-logs/                # Audit log badges
│   ├── auth/                      # Login helpers (demo picker, forgot password)
│   ├── commissions/               # Commission module
│   ├── customers/                 # Customer CRUD + bulk import
│   ├── dashboard/                 # Dashboard widgets (stats, activity, renewals)
│   ├── documents/                 # Document management
│   ├── global/                    # Navbar, Sidebar, Search, Breadcrumbs, Notifications
│   ├── layouts/                   # DashboardLayout (sidebar + navbar + content)
│   ├── policies/                  # Policy form, bulk import, upload, verification
│   ├── premiums/                  # Premium management + charts
│   ├── renewals/                  # Renewal actions + calendar
│   ├── reports/                   # Report charts
│   ├── sales-leads/               # Lead management UI (form, timeline, convert)
│   ├── users/                     # User bulk import
│   ├── error-boundary.tsx         # Error boundary component
│   ├── swr-provider.tsx           # Global SWR config
│   └── theme-provider.tsx         # next-themes wrapper
│
├── lib/
│   ├── api/
│   │   ├── auth-middleware.ts     # requireAuth() - JWT verification + role checking
│   │   └── protect.ts            # Combined rate-limit + CSRF guard
│   ├── context/
│   │   ├── auth-context.tsx       # AuthProvider (login, logout, session timer)
│   │   └── app-settings-context.tsx # AppSettingsProvider (40+ configurable settings)
│   ├── hooks/                     # 16 custom hooks
│   │   ├── use-supabase-query.ts  # Core data hook (useCollection, useDoc)
│   │   ├── use-realtime.ts        # Singleton WebSocket channel for all tables
│   │   ├── use-policies.ts        # Policy queries with role-based scoping
│   │   ├── use-customers.ts       # Customer queries
│   │   ├── use-leads.ts           # Sales lead queries
│   │   └── ... (12 more domain hooks)
│   ├── services/                  # 16 service modules (Supabase CRUD)
│   │   ├── index.ts               # Barrel export
│   │   ├── policy.service.ts      # Policy operations
│   │   ├── customer.service.ts    # Customer operations
│   │   ├── lead.service.ts        # Lead lifecycle operations
│   │   └── ... (13 more service modules)
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client (singleton)
│   │   ├── server.ts              # Service-role admin client (bypasses RLS)
│   │   ├── middleware.ts          # Cookie-based session refresh
│   │   └── database.types.ts     # TypeScript DB types
│   ├── security/
│   │   ├── headers.ts             # Security headers + IP whitelist
│   │   ├── rate-limiter.ts        # In-memory sliding window rate limiter
│   │   ├── csrf.ts                # Origin/Referer-based CSRF protection
│   │   └── forbidden-logger.ts    # Forbidden access logging
│   ├── helpers/                   # Pure utilities
│   │   ├── animations.ts          # Framer Motion animation presets
│   │   ├── chart-theme.ts         # Recharts theme config
│   │   ├── compress-file.ts       # Image compression
│   │   ├── export-report.ts       # Excel/CSV export
│   │   ├── friendly-error.ts      # User-friendly error mapping
│   │   ├── logger.ts              # Structured logging
│   │   ├── pdf-extractor.ts       # PDF text extraction
│   │   ├── policy.ts              # Policy number generation helpers
│   │   ├── storage.ts             # Supabase Storage helpers
│   │   └── whatsapp.ts            # WhatsApp deep link helpers
│   ├── validations/               # Zod schemas for each module
│   │   ├── policy.ts, customer.ts, lead.ts, premium.ts, renewal.ts
│   │   ├── attendance.ts, commission.ts, campaign.ts, document.ts
│   │   ├── settings.ts, audit-log.ts
│   │   └── policy-fields-config.ts # Dynamic field config per policy type
│   ├── types/index.ts             # All TypeScript interfaces (16+ entities)
│   ├── permissions.ts             # RBAC permission matrix
│   └── utils.ts                   # cn(), formatCurrency(), formatDate(), formatPhone()
│
├── supabase/
│   ├── migrations/                # 12 SQL migration files (001-012)
│   └── seed.sql                   # Sample data (3 users, 5 customers, 5 policies, etc.)
│
├── scripts/
│   ├── dev-local.js               # Docker + Supabase + Next.js startup
│   └── db-push.mjs                # DB migration push
│
├── tests/                         # Vitest tests (17 files)
├── e2e/                           # Playwright E2E tests
├── proxy.ts                       # Next.js 16 proxy (security headers, CSP, auth)
├── instrumentation.ts             # Sentry instrumentation
├── next.config.ts                 # Next.js config (Turbopack, Sentry, bundle analyzer)
├── vitest.config.ts               # Vitest configuration
├── playwright.config.ts           # Playwright configuration
└── components.json                # shadcn/ui configuration
```

### Provider Nesting Order (Root Layout)
```
html > body > ThemeProvider > AuthProvider > SWRProvider > TooltipProvider > {children} + Toaster
```

### Dashboard-Specific
```
DashboardLayout > AppSettingsProvider > {sidebar + navbar + content}
```

---

## API Patterns

### Route Structure
All API routes are in `/app/api/` using Next.js App Router Route Handlers. Each exports named HTTP method functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

### Standard API Pattern
```typescript
// Example: POST /api/policies
export async function POST(req: NextRequest) {
  // 1. Rate limit + CSRF protection
  const blocked = await protect(req, { maxRequests: 30 });
  if (blocked) return blocked;

  // 2. JWT + role check
  const auth = await requireAuth(req, ["admin", "manager", "employee"]);
  if ("error" in auth) return NextResponse.json(auth, { status: auth.status });

  // 3. Parse & validate body
  const body = await req.json();
  const parsed = policySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // 4. Business logic (using supabaseAdmin for service-role queries)
  const { data, error } = await supabaseAdmin.from("policies").insert(parsed.data).select().single();

  // 5. Audit log entry
  await supabaseAdmin.from("audit_logs").insert({ ... });

  // 6. Return JSON response
  return NextResponse.json({ data });
}
```

### API Response Format
```typescript
// Success
{ data: T }

// Error
{ error: string, status?: number }

// List with count
{ data: T[], count: number }
```

### Key API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/health` | GET | Health check (public, no auth) |
| `POST /api/policies` | POST | Create policy (auto-number, PDF required for employees) |
| `PUT /api/policies/[id]` | PUT | Update policy |
| `POST /api/policies/[id]/lock` | POST | Lock/unlock policy |
| `POST /api/policies/[id]/verify` | POST | Verification checklist |
| `POST /api/leads` | POST | Create sales lead |
| `PUT /api/leads/[id]` | PUT | Update lead (status, reassignment) |
| `POST /api/leads/[id]/timeline` | POST | Add timeline entry |
| `POST /api/leads/[id]/documents` | POST | Upload lead document |
| `POST /api/customers/auto-create` | POST | Auto-create customer from PDF extraction |
| `POST /api/customers/create-portal-account` | POST | Create customer portal account |
| `POST /api/customers/[id]/deactivate` | POST | Soft-delete customer |
| `POST /api/upload` | POST | File upload to Supabase Storage |
| `POST /api/extract-pdf` | POST | PDF text extraction |
| `POST /api/email` | POST | Send email via SMTP |
| `POST /api/email/send-reminder` | POST | Send renewal reminder |

---

## Authentication & Security (CRITICAL)

### Auth Architecture (3 Layers)

**Layer 1 — Proxy (`proxy.ts`)**
- Next.js 16 proxy convention (runs on every non-static request)
- Root `/` redirects to `/dashboard` or `/login` based on token presence
- Refreshes Supabase auth cookies on every request
- All `/api/*` routes require a Bearer token (returns 401 if missing)
- Public paths: `/login`, `/api/health`
- Applies comprehensive security headers including dynamic CSP

**Layer 2 — AuthProvider (`lib/context/auth-context.tsx`)**
- Client-side React context wrapping the entire app
- Listens to `onAuthStateChange` and loads user profile from `users` table
- Session timeout with configurable duration (default: 30 minutes, from `system_config`)
- Activity-based timer reset (mousedown, keydown, scroll, touchstart, mousemove)
- Countdown warning 60 seconds before expiry
- Login attempt tracking via `login_attempts` table + RPC functions
- Account lockout after configurable max attempts (default: 5)
- Inactive user check (`profile.status === "active"`)

**Layer 3 — API Auth Middleware (`lib/api/auth-middleware.ts`)**
- `requireAuth(req, allowedRoles?)` — extracts Bearer token, verifies JWT, loads profile, checks role
- Returns `CallerClaims { uid, email, role, branch_id, name }` on success
- Returns `AuthError { error, status: 401 | 403 }` on failure
- Used by every API route handler

### User Roles
Three roles defined in `UserRole` type and PostgreSQL enum:

| Role | Description | Access |
|------|-------------|--------|
| **admin** | Full platform access | All modules including User Management & Settings |
| **manager** | Operational management | Most modules except User Management & Settings; can restore archives |
| **employee** | Limited agent access | Only assigned/created items; policies auto-locked after creation |

### Permission Matrix (`lib/permissions.ts`)
- Defines `AppModule` (16 modules) and `Action` (view, create, edit, delete, export, restore, broadcast)
- `PERMISSIONS` record maps each role to allowed actions per module
- Helper functions: `hasPermission()`, `getAccessibleModules()`, `getMenuItemsForRole()`, `getAllowedActions()`

**API Access Control Matrix:**
| Module | Employee | Manager | Admin |
|--------|----------|---------|-------|
| Dashboard | ✅ View | ✅ View | ✅ View |
| Policies | ✅ View/Create (own, auto-locked) | ✅ Full (no delete) | ✅ Full |
| Customers | ✅ View/Create | ✅ Full | ✅ Full |
| Renewals | ✅ View | ✅ Full | ✅ Full |
| Premiums | ✅ View/Create | ✅ Full | ✅ Full |
| Sales Leads | ✅ View/Create (assigned) | ✅ Full | ✅ Full |
| Attendance | ✅ Own only | ✅ View all | ✅ Full |
| Documents | ✅ View/Create | ✅ Full | ✅ Full |
| Reports | ❌ | ✅ View/Export | ✅ Full |
| Campaigns | ❌ | ✅ Full | ✅ Full |
| Commissions | ✅ View (own) | ✅ View | ✅ Full |
| Audit Logs | ❌ | ✅ View | ✅ Full |
| Archives | ❌ | ✅ View/Restore | ✅ Full |
| Notifications | ✅ Own | ✅ Broadcast | ✅ Full |
| Users | ❌ | ❌ | ✅ Full |
| Settings | ❌ | ❌ | ✅ Full |

### Security Headers (applied in both `proxy.ts` and `next.config.ts`)
| Header | Value |
|--------|-------|
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` |
| Content-Security-Policy | Dynamic (includes Supabase HTTP + WS origins, Google APIs, Sentry, Vercel) |
| X-DNS-Prefetch-Control | `on` |
| Cache-Control | `no-store, max-age=0` on `/api/*`; `public, max-age=31536000, immutable` on `/_next/static/*` |
| poweredByHeader | `false` |

### Rate Limiting (`lib/security/rate-limiter.ts`)
- In-memory sliding window algorithm with LRU eviction (10,000 entries max)
- Default: 20 requests per 60 seconds
- Returns `429 Too Many Requests` with `Retry-After` and `X-RateLimit-*` headers
- Stale entry cleanup every 5 minutes
- IP identification: `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip`

### CSRF Protection (`lib/security/csrf.ts`)
- Origin/Referer header validation for state-changing methods (POST, PUT, PATCH, DELETE)
- Allowed hosts: `localhost:3000`, `localhost:3001`, `NEXT_PUBLIC_APP_URL`, Vercel system URLs
- Falls back to Authorization header presence check
- Returns `403 Forbidden` if origin cannot be verified

### IP Whitelisting (`lib/security/headers.ts`)
- Optional `OFFICE_IP_WHITELIST` env var (comma-separated)
- Localhost always allowed
- Returns `403 Access denied` for unauthorized IPs

### Combined Protection (`lib/api/protect.ts`)
- Single `protect(req, options)` function combining rate limit + CSRF
- Default: 30 requests per 60 seconds
- `skipCsrf` option for GET-only routes

---

## Data Layer Patterns

### Supabase Client Usage
| Context | Client | Purpose |
|---------|--------|---------|
| Browser components | `lib/supabase/client.ts` | `createBrowserClient` singleton, respects RLS |
| API routes (server) | `lib/supabase/server.ts` | `createClient` with `service_role` key, **bypasses RLS** |
| Proxy/middleware | `lib/supabase/middleware.ts` | `createServerClient` for cookie management |

### Service Layer (`lib/services/`)
16 service modules providing Supabase CRUD wrappers. All use the browser client. Pattern:
```typescript
const TABLE = "table_name";

export async function getItem(id: string): Promise<Type | null> {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Type ?? null;
}
```

### Hook Layer (`lib/hooks/`)
Each module has a dedicated hook composing `useCollection`/`useDoc`/`useSWR` with Realtime subscriptions.

**Core Data Hook (`use-supabase-query.ts`):**
- `useCollection<T>(key, table, filters, sort, dir, limit)` — list with filtering, sorting, pagination
- `useDoc<T>(key, table, docId)` — single document
- In-memory LRU cache (100 entries, 60s TTL) for instant back-navigation
- Fallback polling every 5 minutes
- Realtime subscription triggers debounced refetch (500ms)
- Tab visibility-aware (pauses polling when hidden)
- Automatic polling suspension after 3 consecutive errors

**Realtime (`use-realtime.ts`):**
- ONE shared WebSocket channel (`rt_global`) for ALL 21 tables
- Callback registry pattern — hooks register/unregister per table
- `useRealtimeTable(table, callback)` + `useRealtimeSubscription(swr, table)`

### Important Data Patterns
- **Policy numbers:** Atomic generation via `increment_policy_counter` RPC (never read-then-write)
- **Customer UIDs:** Sequential 4-digit (`C-0001`) via `counters` table
- **Lead UIDs:** Sequential via `next_lead_uid` RPC
- **Role-based data scoping:** Employees see only assigned/created items (enforced in hooks)
- **Soft deletion:** Use `deleted_at`/`deleted_by` fields, view archived in `/dashboard/archives`

---

## Database Schema

### PostgreSQL Enums
`user_role`, `user_status`, `policy_status`, `policy_type_enum`, `payment_frequency`,
`renewal_status`, `premium_status`, `commission_status`, `commission_type`,
`attendance_status`, `early_checkout_status`, `campaign_status`

### Tables (26+)
| Table | Purpose |
|-------|---------|
| `branches` | Office branches |
| `users` | User profiles (FK to `auth.users`) |
| `counters` | Atomic sequence counters (customer UIDs, policy numbers) |
| `customers` | Customer records with soft-delete |
| `policies` | Insurance policies (12 types, type-specific fields) |
| `renewals` | Policy renewal tracking |
| `premiums` | Premium collection tracking |
| `commission_rules` | Tiered commission rules by policy type & insurer |
| `commissions` | Commission records per agent |
| `campaigns` | Marketing campaigns with ROI tracking |
| `attendance` | Daily attendance records |
| `early_checkout_requests` | Early checkout approval workflow |
| `holidays` | Company holidays |
| `documents` | File metadata (Supabase Storage) |
| `notifications` | In-app notifications |
| `audit_logs` | Complete audit trail |
| `system_config` | Key-value config store (40+ settings) |
| `company_templates` | PDF extraction patterns per insurer |
| `daily_reminders` | Daily reminder dismissal tracking |
| `policy_verification_logs` | Policy verification checklist |
| `login_attempts` | Login attempt tracking + lockout |
| `customer_portal_users` | Separate portal user accounts |
| `sales_leads` | Sales lead management |
| `lead_timeline` | Lead activity timeline |
| `lead_documents` | Lead-attached documents |
| `archives` | Archived/deleted records |

### 12 Migrations (`supabase/migrations/`)
001 through 012, covering schema creation, enums, RLS policies, RPC functions, indexes, Realtime enablement, and the sales leads module.

---

## Domain-Specific Guidelines

### Policy Management (12 Insurance Types)
- **Types:** Motor, Health, Life, Fire, Marine, Burglary, Liability, Workmen Compensation, CAR/EAR, Surety Bond, Travel, Other
- **Auto-generated policy numbers:** `PREFIX-YEAR-NNNN` format, atomic via `increment_policy_counter` RPC
- **Type-specific fields:** Vehicle info for Motor, risk location for Fire, project details for CAR/EAR, etc.
- **PDF upload required** for employees when creating policies
- **Auto-lock** after employee creation (admin/manager must unlock for edits)
- **Verification workflow:** 4-point checklist before approval
- **Status flow:** `draft` → `active` → `expired` / `cancelled`
- Dynamic field config per policy type in `lib/validations/policy-fields-config.ts`

### Customer Management
- **Sequential UID:** `C-0001`, `C-0002` via `counters` table
- **Bulk import:** CSV via `papaparse`
- **Soft-delete:** `deleted_at`/`deleted_by` fields, restorable from Archives
- **Portal access:** Separate `customer_portal_users` table for customer self-service

### Sales Lead Management
- **Status flow:** `new` → `contacted` → `follow_up` → `interested` → `converted` / `not_interested` / `lost`
- **Sources:** referral, walk_in, online, telecall, social_media, agent, other
- **Priority levels:** low, medium, high, urgent
- **Lead scoring** for prioritization
- **Timeline tracking:** All actions logged in `lead_timeline`
- **Conversion:** Leads can be converted to customers

### Renewal Management
- **Status flow:** `due` → `contacted` → `renewed` / `lost`
- **Calendar view** for visual tracking
- **Email reminders** via SMTP (Nodemailer)

### Attendance Management
- **Status types:** present, absent, half_day, late, leave
- **Check-in/Check-out** tracking with worked hours calculation
- **Early checkout** request/approval workflow
- **Auto-checkout** at configurable time
- **Auto-logout** on approved early checkout
- **Holiday management** system

### Commission Management
- **Rules engine:** Percentage or flat rate, tiered by premium range, per insurer
- **Status flow:** pending → approved → paid / rejected
- Currently **temporarily disabled in UI**

### Settings-Driven Behavior (`AppSettingsProvider`)
40+ configurable settings across categories:
- **General:** App name, currency, date format
- **Policy:** Auto-numbering prefix, PDF requirement toggle
- **Attendance:** Auto-checkout time, working hours
- **Branches:** Office locations
- **Notifications:** Email settings
- **Commissions:** Enable/disable, calculation rules
- **Holidays:** Manage company holidays
- **Security:** Session timeout, max login attempts, IP whitelist
- **Dropdowns:** Customizable dropdown options
- **Templates:** PDF extraction patterns

---

## Audit Logging (CRITICAL)

All actions across all modules MUST be logged in `audit_logs`:

**Action Types:**
| Action | Trigger |
|--------|---------|
| `create` | New record created |
| `update` | Record modified |
| `delete` | Record deleted/archived |
| `login` | Successful login |
| `logout` | User logout |
| `pdf_upload` | Document uploaded |
| `bulk_import` | Bulk data import |
| `config_change` | Settings modified |
| `password_change` | Password updated |
| `forbidden_access` | Unauthorized access attempt |
| `ip_blocked` | IP whitelist violation |
| `role_denied` | Insufficient role access |
| `rate_limited` | Rate limit exceeded |
| `deactivate` | Account/record deactivated |

**Logged Data:** user_id, action, module, details (JSON), ip_address, timestamp

---

## UI Component Library (shadcn/ui)

### Installed Components (26)
`alert-dialog`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `popover`, `progress`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`

### Component Import Pattern
```typescript
// Always import from @/components/ui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
```

### shadcn/ui Configuration (`components.json`)
- Style: `new-york`
- RSC: `true`
- Base color: `neutral`
- CSS variables: `true`
- Icon library: `lucide`

### Adding New shadcn Components
```bash
npx shadcn@latest add [component-name]
```

---

## Testing Guidelines

### Vitest (Unit/Integration)
- Config: `/vitest.config.ts`
- Environment: `jsdom`
- Setup file: `/tests/setup.ts`
- Coverage: v8 provider, 70% thresholds for `lib/` (statements, functions, lines), 60% branches
- Coverage reporters: text, text-summary, html, lcov
- Excludes: `lib/types/`, `components/ui/`, `*.d.ts`, `*/index.ts`

### Playwright (E2E)
- Config: `/playwright.config.ts`
- Browser: Chromium only
- Sequential execution, 1 worker
- Timeout: 60 seconds
- Screenshots on failure, trace on first retry
- 2 retries in CI

### Test File Convention
```
tests/
├── api/              # API route tests
├── components/       # Component tests
├── hooks/            # Hook tests
├── integration/      # Integration tests
├── security/         # Security tests (rate-limiter, role-enforcement)
├── services/         # Service module tests
├── utils/            # Utility function tests
└── setup.ts          # Shared test setup/mocks
```

---

## CI/CD Pipeline (GitHub Actions)

### Workflow (`.github/workflows/ci.yml`)
**Trigger:** Push to `main`, PR to `main`
**Concurrency:** Cancels in-progress runs for same ref
**Node version:** 20

### 4 Jobs (Sequential Pipeline)
| Job | Depends On | Steps |
|-----|------------|-------|
| **Lint & Type-Check** | — | `npx eslint .` + `npx tsc --noEmit` |
| **Tests** | Lint | `npx vitest run --reporter verbose` + coverage |
| **Security Audit** | — | `npm audit --audit-level=high` (continue-on-error) |
| **Build** | Lint + Test + Audit | `npx next build` with Supabase secrets |

### Deployment
- Deployed to **Vercel** (region: `bom1` Mumbai)
- `vercel.json` configures framework, build/install commands, headers, region

---

## Naming Conventions

### Files & Folders
```
- Components: kebab-case (policy-form.tsx, customer-list.tsx)
- Pages: page.tsx in route folders (Next.js convention)
- Hooks: camelCase prefixed with 'use' (use-policies.ts, use-attendance.ts)
- Services: kebab-case with .service suffix (policy.service.ts, lead.service.ts)
- Validations: kebab-case (policy.ts, customer.ts in lib/validations/)
- Types: index.ts barrel export in lib/types/
- Config: kebab-case (rate-limiter.ts, auth-middleware.ts)
```

### Database
- **Tables:** snake_case plural (`policies`, `audit_logs`, `commission_rules`)
- **Fields:** snake_case (`user_id`, `created_at`, `policy_number`)
- **Enums:** snake_case (`user_role`, `policy_status`, `attendance_status`)
- **RPC functions:** snake_case (`increment_policy_counter`, `next_lead_uid`)

### APIs
- Use kebab-case for URL paths: `/api/extract-pdf`, `/api/send-reminder`
- RESTful resources: `/api/policies`, `/api/policies/[id]`, `/api/leads/[id]/timeline`
- Action endpoints: `/api/policies/[id]/lock`, `/api/policies/[id]/verify`

---

## Error Handling

### Client-Side
- `lib/helpers/friendly-error.ts` maps technical errors to user-friendly messages
- Toast notifications via `sonner` for all user-facing errors
- Error boundary component (`components/error-boundary.tsx`)
- Global error page (`app/global-error.tsx`)

### Server-Side (API Routes)
- Always wrap async operations in try-catch
- Return structured error JSON: `{ error: string, status: number }`
- Log errors with context via `lib/helpers/logger.ts`
- Map Supabase errors to meaningful HTTP status codes

### Forbidden Access
- `lib/security/forbidden-logger.ts` logs all unauthorized access attempts
- Logged to `audit_logs` with action type `forbidden_access`, `ip_blocked`, or `role_denied`

---

## Realtime Features

### Architecture
- **Single shared WebSocket channel** (`rt_global`) for all 21 tables
- Supabase Realtime `postgres_changes` subscriptions
- Callback registry pattern in `use-realtime.ts`

### How It Works
1. `useRealtimeTable(table, callback)` — register a callback for INSERT/UPDATE/DELETE on a table
2. When a change is detected, the registered callback fires
3. `useRealtimeSubscription(swr, table)` bridges Realtime events to SWR mutate (triggers refetch)
4. `useCollection` hooks automatically subscribe via `useRealtimeSubscription`

### Important Notes
- The singleton channel is created once and shared across all hooks
- Hooks register/unregister callbacks on mount/unmount
- Debounced refetch (500ms) to prevent rapid consecutive refetches
- Tab visibility-aware — pauses polling when tab is hidden

---

## General Principles
1. **DRY (Don't Repeat Yourself):** Extract common logic into services/hooks/helpers
2. **SOLID Principles:** Single responsibility, especially in service and hook layers
3. **Readability:** Code should be self-documenting; comments for "why", not "what"
4. **Maintainability:** Follow established patterns in the codebase
5. **Security First:** Always apply `protect()` + `requireAuth()` in API routes
6. **Role Enforcement in Both Places:** UI/menu from `permissions.ts` AND API from `auth-middleware.ts`
7. **Settings-Driven:** Use `AppSettingsProvider` for configurable behavior, not hardcoded values
8. **Prefer Existing Patterns:** Use `useCollection`/`useDoc` hooks, not ad-hoc Supabase queries
9. **Atomic Operations:** Use RPC functions for counters/sequences, never read-then-write
10. **Audit Everything:** Log all actions to `audit_logs` table
