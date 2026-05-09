# BP & AF Insurance CRM - Business Flow Documentation

This document outlines the core operational flows within the BP & AF Insurance CRM, from customer acquisition to policy lifecycle management and support.

## 1. Customer & Policy Lifecycle (The "Happy Path")

The primary flow of the system follows the journey of a prospect becoming a policyholder.

```mermaid
graph TD
    A[Intake / Lead Generation] -->|Qualify| B[Sales Lead]
    B -->|Gather Info| C[Quote Generation]
    C -->|Comparison| D[Proposal Creation]
    D -->|Underwriting/Approval| E[Policy Issuance]
    E -->|Payment| F[Active Policy]
    F -->|Expiry Approaching| G[Renewal Pipeline]
    G -->|Accept| F
    G -->|Reject| H[Lapsed / Archived]
```

### Flow Steps:
1. **Intake**: New inquiries enter through the `Intake` module.
2. **Sales Leads**: Qualified inquiries are tracked as `Sales Leads`, where follow-ups are managed via `Lead Reminders`.
3. **Quotes & Proposals**: Once the customer's needs are defined, `Quotes` are generated and converted into a `Proposal`.
4. **Policy Issuance**: After the proposal is accepted and the premium is confirmed, a `Policy` record is created.
5. **Renewal**: 30-60 days before expiry, the policy automatically enters the `Renewal Pipeline`.

---

## 2. Service Desk & Support Flow

Handles post-issuance requests like E-Cards, endorsements, or queries.

```mermaid
graph LR
    T1[Ticket Created] --> T2[Categorized]
    T2 --> T3[SLA Clock Starts]
    T3 --> T4[In Progress]
    T4 -->|Optional| T5[Escalated]
    T5 --> T6[Resolved]
    T4 --> T6
    T6 --> T7[Closed/Archived]
```

### Key Logic:
- **SLA Engine**: Every ticket is assigned an `SLA Deadline` based on its category and priority (configured in `sla_config`).
- **Escalation**: If a ticket isn't resolved within the SLA, the `escalation_level` increases, triggering notifications to managers.
- **Audit Log**: Every status change or note added is recorded in the `ticket_activity_log`.

---

## 3. Financial & Commission Flow

Manages the money trail from premium to broker commission.

```mermaid
graph TD
    P1[Policy Created] --> P2[Premium Record Generated]
    P2 --> P3[Invoice Issued]
    P3 --> P4[Payment Received]
    P4 --> P5[Commission Calculated]
    P5 --> P6[Commission Reconciliation]
```

### Key Logic:
- **Commission Rules**: Automatically determined by `policy_type`, `insurer_name`, and `premium_amount`.
- **Reconciliation**: Matches the expected commission from the rule against the actual payout received from the insurer.

---

## 4. Operational & Compliance Flows

- **Attendance Flow**: Employee `Check-In` -> `Late Detection` -> `Working Hours Calculation` -> `Checkout`.
- **KYC Flow**: Customer Document Upload -> Verification Status Update -> Compliance Approval.
- **Audit Flow**: Every sensitive action (Delete, Update, Login) is piped to `audit_logs` via the `AuditLogService`.

---
*Documentation provided by Antigravity AI Agent.*
