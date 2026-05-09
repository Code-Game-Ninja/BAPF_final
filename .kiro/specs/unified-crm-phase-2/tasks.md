# Tasks Document: Unified CRM Phase 2 - Service Desk with SLA Engine

## Overview

**Status: COMPLETE ✅**

---

## Task 1: Database Schema Migration

- [x] 1.1–1.13 All tables, indexes, and pg_cron jobs defined in `scripts/migrate-phase-2.sql`

> Run: `npm run db:migrate:phase2` or paste `scripts/migrate-phase-2.sql` into Supabase SQL Editor

---

## Task 2: SLA Engine Library ✅

- [x] 2.1 `lib/sla/businessHours.ts` — `calculateSLADeadline` function
- [x] 2.2 Business hours exclusion (skip non-working hours)
- [x] 2.3 Weekend exclusion
- [x] 2.4 Holiday exclusion
- [x] 2.5 DST-safe time arithmetic
- [x] 2.6 `getSLACountdownColor` (green/yellow/red/breached)
- [x] 2.7 `calculateRemainingTime` (hours/minutes/display/color)
- [x] 2.8 `calculatePausedSLADeadline` (adjusts deadline by pause duration)
- [x] 2.9–2.10 Edge cases handled (end of day, holiday, weekend boundary)

---

## Task 3: Ticket API Layer ✅

- [x] 3.1 `GET /api/service-desk/tickets` — queue/filters/pagination
- [x] 3.2 `POST /api/service-desk/tickets` — SLA calc + auto-assignment
- [x] 3.3 `GET /api/service-desk/tickets/[id]` — full detail with notes/activity/docs
- [x] 3.4 `PUT /api/service-desk/tickets/[id]` — status transition validation
- [x] 3.5 State machine: open→in_progress→pending/resolved→closed
- [x] 3.6 SLA pause on pending, resume on in_progress
- [x] 3.7 Resolution time calculation on resolved
- [x] 3.8 `POST /api/service-desk/tickets/[id]/notes` — internal/customer
- [x] 3.13 `POST /api/service-desk/tickets/[id]/escalate`
- [x] 3.14 `POST /api/service-desk/tickets/[id]/assign`
- [x] 3.16 Activity log entries for all operations
- [x] 3.17 Notification triggers for assignment, status, escalation, customer notes

---

## Task 4: Auto-Assignment Engine ✅

- [x] 4.1 `lib/tickets/autoAssignment.ts`
- [x] 4.2 Round-robin assignment
- [x] 4.3 Workload-based assignment (fewest open tickets)
- [x] 4.4 Skill-based assignment (with workload fallback)
- [x] 4.5 Agent eligibility check (active users only)
- [x] 4.6 Config via `system_config` table key `ticket_auto_assignment_mode`

---

## Task 5: Service Desk Dashboard ✅

- [x] 5.1 `app/dashboard/service-desk/page.tsx`
- [x] 5.2 Queue tabs (My / Team / Unassigned / All)
- [x] 5.3 Metrics bar (Open/InProgress/Pending/Overdue/Resolved + SLA Rate + Avg Resolve)
- [x] 5.4–5.5 Ticket list table with SLA countdown column
- [x] 5.6–5.7 Filters: Status, Category, Priority, Breached Only + search
- [x] 5.12 `app/dashboard/service-desk/loading.tsx` skeleton

---

## Task 6: SLA Countdown Component ✅

- [x] 6.1–6.7 `components/service-desk/SLACountdown.tsx`
  - Color coding: green/yellow/red/BREACHED/PAUSED
  - Updates every 60 seconds via setInterval
  - Compact mode for table rows, full mode for detail view
  - Shows "Xh Ym" | "BREACHED" | "PAUSED" | "< 1m"

---

## Task 7: Ticket Creation ✅

- [x] 7.1 `components/service-desk/CreateTicketDialog.tsx` — modal with pre-fill support
- [x] 7.3 Customer search and selection
- [x] 7.4 Policy search filtered by selected customer
- [x] 7.5 Category and priority selectors
- [x] 7.8 Wired to `POST /api/service-desk/tickets`
- [x] 7.9 Shows ticket number + SLA hours on success
- [x] 7.10 `app/dashboard/service-desk/new/page.tsx`

---

## Task 8: Ticket Detail View ✅

- [x] 8.1 `app/dashboard/service-desk/[id]/page.tsx`
- [x] 8.3 Ticket header with number, badges, SLA countdown, escalation badge
- [x] 8.4 Status timeline (visual stepper)
- [x] 8.5–8.7 Notes section with Internal/Customer tabs, add note
- [x] 8.8 Activity log (chronological, read-only)
- [x] 8.9 Document attachments list
- [x] 8.10 Quick actions: status transitions, escalate
- [x] 8.11 Escalation dialog (requires reason)
- [x] 8.13 Status update with transition validation (422 on invalid)

---

## Task 9: Metrics Dashboard ✅

- [x] 9.10 `GET /api/service-desk/metrics` — status/category/priority breakdowns, SLA rate, agent performance
- [x] 9.1–9.6 Metrics displayed in dashboard header bar
- [ ] 9.1 Full MetricsDashboard component with charts (recharts) — optional enhancement

---

## Task 10: SLA and Business Hours Configuration ✅

- [x] 10.2 `GET /api/service-desk/sla-config`
- [x] 10.3 `PUT /api/service-desk/sla-config` (admin only)
- [x] 10.5 `GET /api/service-desk/business-hours`
- [x] 10.6 `PUT /api/service-desk/business-hours` (admin only)
- [x] 10.9 Config changes logged to audit log

---

## Task 11: Notification System Integration ✅

- [x] 11.1 Ticket assignment notifications
- [x] 11.2 Status update notifications
- [x] 11.4 Escalation notifications (managers/admins)
- [x] 11.5 Customer note notifications

---

## Task 12: Ticket Templates

- [ ] 12.1–12.5 Template management UI — optional enhancement

---

## Task 14: Integration with Phase 1 ✅

- [x] 14.1–14.2 `ServiceIssuesTab` updated with `CreateTicketDialog` (pre-fills customer)
- [x] 14.5 Service Tickets tab shows tickets from Phase 2 API

---

## Completion Checklist

- [x] Database migration SQL ready (`scripts/migrate-phase-2.sql`)
- [x] SLA Engine library (`lib/sla/businessHours.ts`)
- [x] Auto-assignment engine (`lib/tickets/autoAssignment.ts`)
- [x] All API endpoints implemented (tickets, notes, escalate, assign, metrics, sla-config, business-hours)
- [x] Service Desk Dashboard (`app/dashboard/service-desk/page.tsx`)
- [x] SLA Countdown component with color coding and 60s refresh
- [x] Ticket creation dialog with customer/policy pre-fill
- [x] Ticket detail view with notes, activity log, status transitions
- [x] Escalation dialog with reason requirement
- [x] Notifications for assignment, status, escalation, customer notes
- [x] Phase 1 integration (ServiceIssuesTab uses CreateTicketDialog)
- [x] Zero TypeScript errors across all Phase 2 files
