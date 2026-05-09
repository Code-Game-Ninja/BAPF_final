# PROJECT_INTERNAL_REPORT - BP & AF CRM Technical Audit

## 1. Architecture Overview
The system follows a modern **Clean Architecture** pattern within the Next.js App Router framework.
- **Frontend**: React Server Components (RSC) for data fetching, Client Components for interactivity.
- **Business Logic**: Centralized in `lib/services/`, ensuring that UI components remain "thin".
- **Database Layer**: Supabase with extensive use of Postgres triggers, functions, and `pg_cron` for background tasks.

## 2. Deep Dive: Policy Service (`lib/services/policy.service.ts`)

#### A. Core Functionality & Logic
The `PolicyService` is the primary orchestrator for the policy lifecycle. It handles the critical transition from a `Proposal` to an `Active Policy`. 

- **Atomic Transactions**: The `createPolicy` function is designed to be atomic. It ensures that when a policy is generated, the corresponding `proposal` status is updated to 'converted' in the same logical flow. This prevents "orphan" proposals.
- **Dynamic Premium Calculation**: Unlike simpler systems, this service calculates the `base_premium`, `gst`, and `total_premium` on-the-fly based on the `commission_rules` fetched from the database, ensuring that financial data is never hardcoded.

#### B. Database Interaction (Supabase/Postgres)
The service utilizes the `supabase-js` client with heavy emphasis on **Filtered Selection**. 
- **Query Optimization**: Most queries use `.select('*, customers(*)')` to perform joined fetches in a single round-trip, which is essential for performance given the deep relationship between policies and customer masters.
- **RLS Integration**: The service is built to respect Row Level Security (RLS). Every query implicitly carries the `auth.uid()` of the logged-in agent, ensuring that agents cannot accidentally view or modify policies belonging to other branches.

#### C. Error Handling & Resilience
- **Graceful Failures**: The service uses a standardized `try-catch` block that pipes errors to the `NotificationService`. If a database insertion fails (e.g., due to a constraint violation), the system captures the Postgres error code and returns a human-readable message.
- **Validation**: Before any `UPDATE` or `INSERT`, the service performs a validation check on the `policy_number` to ensure uniqueness, preventing the most common data integrity issue in insurance systems.

#### D. Areas for Refactoring
- **Business Logic Bloat**: Currently, some UI-specific formatting (like currency masking) is happening inside the service. This should be moved to a utility function to keep the service "purely" focused on data and business rules.
- **Async Overhead**: The `generatePolicyDocument` call is currently awaited synchronously. For a faster UI experience, this should be moved to an Edge Function or handled via a background queue.

## 3. Recommended Code Quality Improvements
- **Type Safety**: Some services use `any` for complex database returns. Implementing Zod schemas for API responses would prevent runtime errors.
- **Error Boundaries**: While Sentry is configured, adding granular React Error Boundaries around the complex widgets (like the Attendance Calendar) will prevent a single module failure from crashing the entire dashboard.
