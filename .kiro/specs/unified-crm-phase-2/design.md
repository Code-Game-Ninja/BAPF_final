# Design Document: Unified CRM Phase 2 - Service Desk with SLA Engine

## Overview

This design document specifies the technical architecture, database schema, UI component structure, API endpoints, and data flow for Phase 2 of the Unified CRM. The implementation uses Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage + Auth + Realtime), Tailwind CSS 4, Radix UI, and Framer Motion.

Phase 2 delivers:
- Service Desk Dashboard with queue management
- Multi-channel ticket creation (Customer 360, Policy Detail, Manual)
- SLA Engine with deadline calculation, countdown, and breach detection
- Auto-assignment rules and manual assignment
- Escalation workflows (automatic and manual)
- Internal and customer-visible notes
- Activity logging and audit trail
- Metrics dashboard and reporting
- Notification system integration

---

## Architecture

### Component Hierarchy

```
app/dashboard/service-desk/
├── page.tsx                          # Service Desk Dashboard (server component)
├── loading.tsx                       # Skeleton loader
├── new/
│   └── page.tsx                      # Manual ticket creation
└── [id]/
    └── page.tsx                      # Ticket Detail view

components/service-desk/
├── ServiceDeskLayout.tsx             # Main layout with queue tabs
├── TicketQueuePanel.tsx              # Queue display with metrics
├── TicketListTable.tsx               # Sortable/filterable ticket table
├── TicketMetricsBar.tsx              # Summary metrics row
├── TicketFilters.tsx                 # Filter sidebar/panel
├── CreateTicketDialog.tsx            # Ticket creation modal (from C360/Policy)
├── CreateTicketForm.tsx              # Full ticket creation form (manual)
├── TicketDetailLayout.tsx            # Ticket detail shell
├── TicketHeader.tsx                  # Ticket number, status, SLA countdown
├── SLACountdown.tsx                  # Real-time SLA countdown component
├── StatusTimeline.tsx                # Visual status progression
├── NotesSection.tsx                  # Internal + customer notes
├── ActivityLogSection.tsx            # Chronological activity log
├── DocumentAttachments.tsx           # File attachments
├── EscalationDialog.tsx              # Manual escalation modal
├── AssignOwnerDialog.tsx             # Agent assignment modal
├── MetricsDashboard.tsx              # Service metrics charts
└── AgentPerformanceTable.tsx         # Per-agent metrics
```

---

## Database Schema

### Table: service_tickets (extended)

```sql
-- Extends existing service_tickets table
ALTER TABLE service_tickets
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0 CHECK (escalation_level IN (0,1,2)),
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS is_breached BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS breached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS resolved_on_time BOOLEAN,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_total_pause_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES ticket_templates(id);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON service_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON service_tickets(owner_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON service_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON service_tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_tickets_is_breached ON service_tickets(is_breached);
CREATE INDEX IF NOT EXISTS idx_tickets_escalation ON service_tickets(escalation_level);
```

### Table: ticket_notes

```sql
CREATE TABLE IF NOT EXISTS ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','customer')),
  author_id UUID NOT NULL REFERENCES users(id),
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ticket_notes_ticket ON ticket_notes(ticket_id);
CREATE INDEX idx_ticket_notes_visibility ON ticket_notes(visibility);
```

### Table: ticket_activity_log

```sql
CREATE TABLE IF NOT EXISTS ticket_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'created','status_changed','assigned','reassigned','note_added',
    'document_uploaded','document_deleted','escalated','sla_breached',
    'sla_paused','sla_resumed','archived'
  )),
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES users(id),
  performed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_ticket ON ticket_activity_log(ticket_id);
CREATE INDEX idx_activity_log_created ON ticket_activity_log(created_at DESC);
```

### Table: ticket_documents

```sql
CREATE TABLE IF NOT EXISTS ticket_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_ticket_docs_ticket ON ticket_documents(ticket_id);
```

### Table: ticket_templates

```sql
CREATE TABLE IF NOT EXISTS ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  description_template TEXT,
  internal_notes_template TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: sla_config

```sql
CREATE TABLE IF NOT EXISTS sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  sla_hours NUMERIC NOT NULL CHECK (sla_hours > 0),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, priority)
);

-- Default SLA values
INSERT INTO sla_config (category, priority, sla_hours) VALUES
  ('ecard_request', 'urgent', 4),
  ('ecard_request', 'high', 8),
  ('ecard_request', 'medium', 24),
  ('ecard_request', 'low', 48),
  ('member_endorsement', 'urgent', 8),
  ('member_endorsement', 'high', 24),
  ('member_endorsement', 'medium', 48),
  ('member_endorsement', 'low', 72),
  ('general_query', 'urgent', 4),
  ('general_query', 'high', 8),
  ('general_query', 'medium', 16),
  ('general_query', 'low', 24)
ON CONFLICT (category, priority) DO NOTHING;
```

### Table: business_hours_config

```sql
CREATE TABLE IF NOT EXISTS business_hours_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_working_day BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_of_week)
);

-- Default: Mon-Fri 9am-6pm
INSERT INTO business_hours_config (day_of_week, start_time, end_time, is_working_day) VALUES
  (0, '09:00', '18:00', FALSE), -- Sunday
  (1, '09:00', '18:00', TRUE),  -- Monday
  (2, '09:00', '18:00', TRUE),  -- Tuesday
  (3, '09:00', '18:00', TRUE),  -- Wednesday
  (4, '09:00', '18:00', TRUE),  -- Thursday
  (5, '09:00', '18:00', TRUE),  -- Friday
  (6, '09:00', '18:00', FALSE)  -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;
```

### Table: holidays

```sql
-- Already exists in codebase, ensure it has:
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS year INTEGER;
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
```

---

## API Endpoints

### GET /api/service-desk/tickets
Query params: `queue` (my|team|unassigned|all), `status`, `category`, `priority`, `assigned_to`, `customer_id`, `policy_id`, `search`, `page`, `limit`, `sort`, `order`, `breached_only`, `escalated_only`, `include_archived`

### POST /api/service-desk/tickets
Creates a new ticket with SLA calculation and auto-assignment.

### GET /api/service-desk/tickets/[id]
Returns full ticket with notes, activity log, documents.

### PUT /api/service-desk/tickets/[id]
Updates ticket (status, priority, owner, etc.).

### POST /api/service-desk/tickets/[id]/notes
Adds a note (internal or customer).

### PUT /api/service-desk/tickets/[id]/notes/[noteId]
Updates a note.

### DELETE /api/service-desk/tickets/[id]/notes/[noteId]
Deletes a note.

### POST /api/service-desk/tickets/[id]/documents
Uploads a document attachment.

### DELETE /api/service-desk/tickets/[id]/documents/[docId]
Deletes a document attachment.

### POST /api/service-desk/tickets/[id]/escalate
Escalates a ticket manually.

### POST /api/service-desk/tickets/[id]/assign
Assigns or reassigns a ticket.

### POST /api/service-desk/tickets/bulk
Bulk operations (assign, status update, export).

### GET /api/service-desk/metrics
Returns service desk metrics for the dashboard.

### GET /api/service-desk/sla-config
Returns current SLA configuration.

### PUT /api/service-desk/sla-config
Updates SLA configuration (admin only).

### GET /api/service-desk/business-hours
Returns business hours configuration.

### PUT /api/service-desk/business-hours
Updates business hours configuration (admin only).

---

## SLA Engine Design

### Business Hours Calculation

```typescript
// lib/sla/businessHours.ts

export function calculateSLADeadline(
  createdAt: Date,
  slaHours: number,
  businessHours: BusinessHoursConfig[],
  holidays: string[]
): Date {
  let remainingMinutes = slaHours * 60;
  let current = new Date(createdAt);

  while (remainingMinutes > 0) {
    const dayConfig = businessHours.find(h => h.day_of_week === current.getDay());
    const isHoliday = holidays.includes(current.toISOString().split('T')[0]);

    if (!dayConfig?.is_working_day || isHoliday) {
      // Skip to next day start
      current = nextDayStart(current, businessHours);
      continue;
    }

    const dayStart = setTime(current, dayConfig.start_time);
    const dayEnd = setTime(current, dayConfig.end_time);

    if (current < dayStart) current = dayStart;
    if (current >= dayEnd) {
      current = nextDayStart(current, businessHours);
      continue;
    }

    const availableMinutes = (dayEnd.getTime() - current.getTime()) / 60000;
    if (remainingMinutes <= availableMinutes) {
      current = new Date(current.getTime() + remainingMinutes * 60000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutes;
      current = nextDayStart(current, businessHours);
    }
  }

  return current;
}
```

### SLA Countdown Color Logic

```typescript
export function getSLACountdownColor(
  createdAt: Date,
  slaDeadline: Date,
  now: Date
): 'green' | 'yellow' | 'red' | 'breached' {
  if (now > slaDeadline) return 'breached';
  const total = slaDeadline.getTime() - createdAt.getTime();
  const remaining = slaDeadline.getTime() - now.getTime();
  const pct = remaining / total;
  if (pct > 0.25) return 'green';
  if (pct > 0.10) return 'yellow';
  return 'red';
}
```

### Background Jobs (Supabase Edge Functions)

```
supabase/functions/
├── sla-breach-checker/
│   └── index.ts    # Runs every 5 minutes via pg_cron
└── escalation-checker/
    └── index.ts    # Runs every 15 minutes via pg_cron
```

**SLA Breach Checker** (every 5 min):
```sql
-- pg_cron job
SELECT cron.schedule('sla-breach-check', '*/5 * * * *', $$
  UPDATE service_tickets
  SET is_breached = TRUE, breached_at = NOW()
  WHERE sla_deadline < NOW()
    AND status NOT IN ('resolved', 'closed')
    AND is_breached = FALSE;
$$);
```

**Escalation Checker** (every 15 min):
```sql
SELECT cron.schedule('escalation-check', '*/15 * * * *', $$
  -- Level 1: SLA + 2 hours
  UPDATE service_tickets
  SET escalation_level = 1, escalated_at = NOW()
  WHERE sla_deadline + INTERVAL '2 hours' < NOW()
    AND status NOT IN ('resolved', 'closed')
    AND escalation_level = 0;

  -- Level 2: SLA + 4 hours
  UPDATE service_tickets
  SET escalation_level = 2, escalated_at = NOW()
  WHERE sla_deadline + INTERVAL '4 hours' < NOW()
    AND status NOT IN ('resolved', 'closed')
    AND escalation_level = 1;
$$);
```

---

## UI Component Design

### Service Desk Dashboard

**Layout**: Left sidebar (queue tabs) + Main content area

**Queue Tabs** (left sidebar):
- My Tickets (count badge)
- Team Tickets (count badge)
- Unassigned (count badge, highlighted if > 0)
- All Tickets

**Metrics Bar** (top of main area):
- Open | In Progress | Pending | Overdue | Resolved | Closed
- SLA On-Time Rate | Avg Resolution Time | Breach Count

**Ticket Table Columns**:
| Column | Sortable |
|--------|----------|
| Ticket # | No |
| Customer | Yes |
| Category | No |
| Priority | Yes |
| Status | No |
| SLA Countdown | Yes |
| Assigned To | No |
| Created | Yes |
| Actions | No |

### SLA Countdown Component

```tsx
// Renders: "2h 34m" in green/yellow/red, or "BREACHED" in red, or "PAUSED"
<SLACountdown
  createdAt={ticket.created_at}
  slaDeadline={ticket.sla_deadline}
  isPaused={ticket.status === 'pending'}
  refreshInterval={60000}
/>
```

### Ticket Detail Layout

**Header**: TKT-XXXXX | Category badge | Priority badge | Status badge | SLA Countdown | Escalation badge

**Left Column (2/3 width)**:
- Status Timeline (visual stepper)
- Description
- Notes Section (tabs: Internal / Customer)
- Activity Log (chronological, newest first)

**Right Column (1/3 width)**:
- Customer info card (link to Client 360)
- Policy info card (if linked)
- Assigned agent card
- Document attachments
- Quick Actions (Update Status / Assign / Escalate / Add Note / Upload)

---

## Data Flow

### Ticket Creation Flow

```
User clicks Create Ticket
  → CreateTicketDialog opens (pre-filled if from C360/Policy)
  → User fills form
  → Client-side validation (zod)
  → POST /api/service-desk/tickets
    → Server: validate customer_id, policy_id
    → Server: fetch SLA config for category+priority
    → Server: calculate SLA_Deadline using business hours
    → Server: apply auto-assignment rules
    → Server: insert ticket record
    → Server: insert activity log entry (created)
    → Server: trigger notification to assigned agent
    → Return created ticket
  → Client: navigate to Ticket Detail view
```

### SLA Breach Detection Flow

```
pg_cron (every 5 min)
  → Query tickets where sla_deadline < NOW() AND status NOT IN (resolved, closed) AND is_breached = FALSE
  → For each breached ticket:
    → UPDATE is_breached = TRUE, breached_at = NOW()
    → INSERT activity_log entry (sla_breached)
    → INSERT notification for ticket owner
    → INSERT notification for all managers
  → Supabase Realtime broadcasts change to connected clients
  → Client SLACountdown component updates to "BREACHED"
```

### Status Update Flow

```
User clicks Update Status
  → Status transition validation (state machine)
  → PUT /api/service-desk/tickets/[id]
    → Server: validate Valid_Status_Transition
    → Server: update ticket status and timestamp
    → If status = resolved: calculate resolution_time_minutes, set resolved_on_time
    → If status = pending: set sla_paused_at
    → If status = in_progress AND was pending: adjust sla_deadline by pause duration
    → Server: insert activity log entry (status_changed)
    → Server: trigger notification to ticket owner
    → Return updated ticket
  → Client: update UI optimistically
```

---

## TypeScript Types (New)

```typescript
export interface TicketNote {
  id: string;
  ticket_id: string;
  content: string;
  visibility: 'internal' | 'customer';
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TicketActivityEntry {
  id: string;
  ticket_id: string;
  entry_type: 'created' | 'status_changed' | 'assigned' | 'reassigned' |
    'note_added' | 'document_uploaded' | 'document_deleted' |
    'escalated' | 'sla_breached' | 'sla_paused' | 'sla_resumed' | 'archived';
  description: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
}

export interface TicketDocument {
  id: string;
  ticket_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  uploaded_by: string;
  uploaded_by_name: string;
  created_at: string;
}

export interface SLAConfig {
  category: string;
  priority: string;
  sla_hours: number;
}

export interface ServiceDeskMetrics {
  queue_counts: Record<string, number>;
  status_counts: Record<string, number>;
  sla_on_time_rate: number;
  avg_resolution_minutes: number;
  breach_count: number;
  agent_performance: AgentPerformance[];
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  tickets_resolved: number;
  avg_resolution_minutes: number;
  sla_compliance_rate: number;
}

// Valid status transitions state machine
export const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress'],
  in_progress: ['pending', 'resolved'],
  pending: ['in_progress'],
  resolved: ['closed'],
  closed: [], // terminal
};
```

---

## Performance Considerations

1. **Ticket List**: Server-side pagination (25 per page). Indexed queries on status, owner_id, sla_deadline.
2. **SLA Countdown**: Client-side timer using `setInterval(60000)`. No server polling.
3. **Realtime Updates**: Supabase Realtime subscription on `service_tickets` table for breach/escalation updates.
4. **Metrics Dashboard**: Materialized view refreshed every 5 minutes for heavy aggregations.
5. **Activity Log**: Append-only table, no updates. Paginated (50 per page, newest first).
6. **Background Jobs**: pg_cron for breach/escalation checks. Edge Functions for notification delivery.

---

## Error Handling

- **Invalid status transition**: Return 422 with allowed transitions list.
- **SLA config not found**: Fall back to default 24-hour SLA.
- **Auto-assignment no eligible agents**: Leave ticket unassigned, notify manager.
- **Document upload failure**: Retry up to 3 times, then show error toast.
- **Notification delivery failure**: Queue for retry with exponential backoff (3 attempts).
