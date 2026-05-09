# BAPF — Local Development Setup

Complete guide to run the BAPF Insurance Management System locally with self-hosted Supabase (Docker).

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 18+ | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Docker Desktop** | 4+ | `docker -v` |
| **Git** | 2+ | `git -v` |

> Docker Desktop must be **running** before you begin. On Windows, ensure WSL 2 is enabled in Docker settings.

---

## Step 1 — Clone the Repo

```bash
git clone https://github.com/YOUR_ORG/bapf.git
cd bapf
npm install
```

---

## Step 2 — Set Up Self-Hosted Supabase

Clone the Supabase Docker stack **next to** the bapf folder:

```bash
# From the parent directory (e.g. BAPF-WORK/)
cd ..
git clone --depth 1 https://github.com/supabase/supabase.git supabase-docker
cd supabase-docker/docker
```

### Generate Secrets

```bash
# Copy the default env
cp .env.example .env

# Generate secure keys (run inside supabase-docker/docker/)
bash utils/generate-keys.sh
```

This generates `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `POSTGRES_PASSWORD`, and `DASHBOARD_PASSWORD`. The script prints them and updates `.env` automatically.

> **Save these keys** — you'll need `ANON_KEY`, `SERVICE_ROLE_KEY`, and `POSTGRES_PASSWORD` for the BAPF `.env.local` file.

### Enable Email Auto-Confirm (Local Dev)

Edit `supabase-docker/docker/.env` and set:

```ini
ENABLE_EMAIL_AUTOCONFIRM=true
```

### Start Supabase

```bash
docker compose pull
docker compose up -d
```

This starts ~13 containers (PostgreSQL, GoTrue Auth, PostgREST, Realtime, Storage, Kong, Studio, etc.).

Verify all containers are running:

```bash
docker compose ps
```

> **Windows CRLF fix**: If the `supabase-pooler` container crash-loops with an Elixir syntax error, run:
> ```bash
> sed -i 's/\r$//' volumes/pooler/pooler.exs
> docker restart supabase-pooler
> ```

### Expose Supabase Studio (Optional)

By default Studio runs on port 3000 (same as Next.js). To use port 3001:

```bash
# Create supabase-docker/docker/docker-compose.override.yml
cat > docker-compose.override.yml << 'EOF'
services:
  studio:
    ports:
      - "3001:3000"
EOF

docker compose up -d studio
```

Studio will be at `http://localhost:3001` (login: `admin` / your `DASHBOARD_PASSWORD`).

---

## Step 3 — Run Database Migrations

### Option A: One Command (Recommended for newcomers)

```bash
npm run db:push
```

This automatically runs all 25 migrations + seed data in order, then verifies the setup. It reads your `.env.local` for connection details. You'll be prompted for the database password (default: `postgres` for local Docker).

### Option B: Manual (pipe each migration)

Pipe each migration file into the Supabase PostgreSQL container:

```bash
# From the bapf/ project root
cat supabase/migrations/001_initial_schema.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/002_customer_portal_users.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/003_schema_fixes.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/004_storage_buckets.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/005_critical_fixes.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/006_add_created_by_role.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/007_production_fixes.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/008_fix_jsonb_boolean_values.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/009_fix_auth_user_role.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/010_enable_realtime_settings.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/011_enable_realtime_all_tables.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/012_sales_leads.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/013_sales_leads_enhancements.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/014_fix_lead_uid_security.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/015_fix_documents_rls.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/016_sales_leads_bugfixes.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/017_lead_reminders.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/018_audit_logs_role_based_access.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/019_expanded_fields_and_endorsements.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/020_kyc_documents.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/021_proposals.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/022_claims.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/023_invoices_and_ledger.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/024_sops_and_communications.sql | docker exec -i supabase-db psql -U postgres -d postgres
cat supabase/migrations/025_customer_kyc.sql | docker exec -i supabase-db psql -U postgres -d postgres
```

### Seed Sample Data

```bash
cat supabase/seed.sql | docker exec -i supabase-db psql -U postgres -d postgres
```

This creates:
- 3 users (admin, manager, employee)
- 1 branch, 5 customers, 5 policies, 5 premiums
- Commission rules, holidays, attendance records, notifications
- 5 sample sales leads, 12 timeline entries, 4 reminders

---

## Step 4 — Configure BAPF

Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase keys (from Step 2):

```ini
# Supabase — use the keys generated by generate-keys.sh
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# App
NEXT_PUBLIC_APP_NAME=BP & AF Insurance Broker
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30

# SMTP (optional — emails will fail silently without this)
SMTP_HOST=localhost
SMTP_PORT=2500
SMTP_FROM="BAPF <noreply@bpaf.in>"
```

---

## Step 5 — Start the App

### Option A: One Command (Recommended)

```bash
npm run dev:local
```

This automatically:
1. Checks Docker is running
2. Starts Supabase containers if they're not already up
3. Waits for the database and API gateway to be healthy
4. Launches the Next.js dev server on `http://localhost:3000`

### Option B: Manual

```bash
# Terminal 1 — Supabase (if not already running)
cd ../supabase-docker/docker
docker compose up -d

# Terminal 2 — Next.js
npm run dev
```

---

## Step 6 — Login

Open `http://localhost:3000` and use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@bpaf.com` | `Admin@123456` |
| Manager | `manager@bpaf.com` | `Manager@123456` |
| Employee | `employee@bpaf.com` | `Employee@123456` |

---

## Daily Usage

```bash
# Start everything
npm run dev:local

# Stop Supabase (data persists in Docker volumes)
cd ../supabase-docker/docker && docker compose stop

# Restart Supabase
cd ../supabase-docker/docker && docker compose up -d

# View Supabase logs
cd ../supabase-docker/docker && docker compose logs -f

# Reset database (WARNING: deletes all data)
cd ../supabase-docker/docker && docker compose down -v
docker compose up -d
# Then re-run migrations and seed (Step 3)
```

---

## Project Structure

```
bapf/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # REST API endpoints (server-side)
│   ├── dashboard/          # Protected dashboard pages
│   └── login/              # Login page
├── components/             # React components (UI + business)
├── lib/
│   ├── api/                # API middleware (auth, rate limiting)
│   ├── context/            # React contexts (auth, settings, theme)
│   ├── hooks/              # Custom hooks (SWR + Realtime)
│   ├── services/           # Business logic services
│   ├── supabase/           # Supabase client (browser + server)
│   └── types/              # TypeScript type definitions
├── supabase/
│   ├── migrations/         # SQL migrations (001-025)
│   └── seed.sql            # Sample data
├── scripts/
│   └── dev-local.js        # One-command startup script
├── proxy.ts                # Next.js 16 proxy (security headers, CSP)
└── .env.example            # Environment variable template
```

---

## Troubleshooting

### "WSL ERROR: execvpe(/bin/bash) failed"
Use `npm run dev:local` instead of `bash scripts/dev-local.sh`. The startup script is Node.js-based and doesn't need bash.

### "Lock was not released within 5000ms"
This is a **harmless dev-only warning** from React Strict Mode double-mounting. It doesn't affect functionality.

### 406 Not Acceptable on API calls
Re-run all migrations — some settings keys may be missing. The seed data in `001_initial_schema.sql` contains all required `system_config` entries.

### Supabase pooler crash-loops (Windows)
Windows CRLF line endings break the Elixir config:
```bash
sed -i 's/\r$//' ../supabase-docker/docker/volumes/pooler/pooler.exs
docker restart supabase-pooler
```

### "Cannot acquire lock" on Next.js startup
A previous dev server left a stale lock:
```bash
rm -f .next/dev/lock
npm run dev:local
```

### Docker containers won't start
```bash
cd ../supabase-docker/docker
docker compose down
docker compose up -d
docker compose ps    # check all containers are "running" or "healthy"
```
