# SYSTEM_ARCHITECTURE_FLOWS - Technical Deep Dive

## 1. The Policy Lifecycle Data Flow

The transition from a Lead to a Policy involves a multi-stage data transformation across several tables.

### Process Flow:
1. **Intake (`intake` table)**: Raw data captured via external form or manual entry.
2. **Sales Lead (`sales_leads`)**: Triggered when an Intake is marked "Qualified".
3. **Quote (`quotes`)**: Multiple quotes are generated and linked to the `lead_id`.
4. **Proposal (`proposals`)**: A selected quote is converted. This stage captures `nominee_details` and `kyc_status`.
5. **Policy (`policies`)**: Upon payment confirmation, the Proposal is promoted to a Policy.

### Technical Relationship:
- **Foreign Keys**: `policies` -> `proposals` -> `quotes` -> `sales_leads`.
- **Atomic Promotion**: The promotion from Proposal to Policy is handled via `lib/services/policy.service.ts`, ensuring that all documents move from the lead folder to the policy folder in Supabase Storage.

---

## 2. Service Desk & SLA Logic Flow

The SLA engine is a "hybrid" system using both Application logic and Database automation.

### Sequence:
1. **Ticket Creation**: `service_tickets` entry is created with a `category` and `priority`.
2. **SLA Assignment**: A database trigger (or service call) looks up `sla_hours` in the `sla_config` table and calculates `sla_deadline = created_at + sla_hours`.
3. **Monitoring**:
    - **App Layer**: The frontend highlights tickets within 2 hours of breaching.
    - **Database Layer**: A `pg_cron` job runs every 5 minutes:
      ```sql
      UPDATE service_tickets SET is_breached = TRUE WHERE sla_deadline < NOW();
      ```
4. **Escalation**: If `is_breached` is true, the `escalation_check` job increments `escalation_level`, which triggers a notification to the assigned `manager_id`.

---

## 3. UI to Database Communication Stack

The project uses a highly efficient "Thin UI" stack:
1. **UI Layer**: Tailwind + Shadcn components (React Client Components).
2. **Hook Layer**: Custom hooks (e.g., `useTodayAttendance`) use **SWR** for caching and **Supabase-js** for real-time.
3. **Service Layer**: Common logic (e.g., `calculatePremium()`) is shared between the API routes and the UI.
4. **Data Layer**: Supabase handles Row Level Security (RLS) so that employees can only see their own assigned customers.

---
*End of Technical Architecture Documentation.*
