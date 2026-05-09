# Requirements Document: Unified CRM Phase 2 - Service Desk with SLA Engine

## Introduction

The Unified CRM Phase 2 feature builds upon Phase 1 (Customer Master + Client 360) to deliver a comprehensive Service Desk with SLA Engine for BP & AF Insurance Broker. This phase enables efficient customer service request management with automated SLA tracking, escalation rules, queue management, and performance metrics.

The system currently has a basic ServiceTicket entity with fields for ticket_number, category, priority, status, and sla_deadline, but lacks:
- Service Desk UI and dashboard
- Ticket creation workflow from multiple entry points
- Real-time SLA countdown and breach detection
- Automated escalation rules
- Queue management and auto-assignment
- Internal vs customer-visible notes
- Service metrics and performance tracking

This phase transforms the platform into a complete service management system supporting:
- Multi-channel ticket creation (Customer 360, Policy Detail, Manual)
- SLA tracking with visual countdown timers and breach alerts
- Queue-based ticket management with auto-assignment rules
- Escalation workflows for overdue tickets
- Dual-track notes (internal staff notes and customer-visible notes)
- Comprehensive service metrics dashboard

**Integration with Phase 1:**
- Leverages Customer_Master for customer data
- Creates Service_Ticket entries visible in Client_360_View Service Tickets tab
- Links tickets to customers and policies from Phase 1

**Integration with Phase 3:**
- Supports GMC-specific ticket categories (ecard_request, member_endorsement)
- Supports Fleet-specific ticket categories (validity_renewal, vehicle_endorsement)
- Links tickets to GMC_Member and Fleet_Vehicle entities

## Glossary

- **System**: The BP & AF Insurance Broker CRM platform
- **Service_Desk**: The unified interface for managing all customer service tickets
- **Service_Ticket**: A customer service request tracked through resolution
- **SLA_Engine**: The subsystem that calculates deadlines, tracks time, and detects breaches
- **SLA_Deadline**: The target date and time by which a ticket must be resolved
- **SLA_Countdown**: The real-time display of remaining time until SLA breach
- **SLA_Breach**: A condition where current time exceeds the SLA deadline
- **Business_Hours**: Working hours excluding weekends and holidays (used for SLA calculation)
- **Ticket_Queue**: A filtered view of tickets (Unassigned, My Tickets, Team Tickets, All Tickets)
- **Auto_Assignment**: The process of automatically assigning tickets to agents based on rules
- **Escalation**: The process of elevating overdue tickets to higher authority levels
- **Escalation_Level**: The hierarchy of escalation (Level 1: Manager, Level 2: Admin)
- **Internal_Note**: A note visible only to staff members
- **Customer_Note**: A note visible to both staff and customers
- **Ticket_Category**: The type of service request (ecard_request, member_endorsement, name_correction, address_correction, invoice_dispute, claim_assistance, general_query, validity_renewal, vehicle_endorsement, policy_query, document_request)
- **Ticket_Priority**: The urgency level (low, medium, high, urgent)
- **Ticket_Status**: The current state (open, in_progress, pending, resolved, closed)
- **Valid_Status_Transition**: A permitted change from one Ticket_Status to another following the state machine rules
- **Ticket_Number_Generator**: The subsystem that generates unique ticket identifiers
- **Service_Agent**: A user with role employee who handles service tickets
- **Service_Manager**: A user with role manager who oversees service operations
- **Queue_Metrics**: Statistics about ticket queues (queue size, average wait time, oldest ticket)
- **Agent_Performance**: Metrics tracking individual agent productivity and SLA compliance
- **Activity_Log**: A chronological record of all actions taken on a ticket

## Requirements

### Requirement 1: Service Desk Dashboard

**User Story:** As a Service Agent, I want to view my ticket queue with metrics and filters, so that I can prioritize and work on tickets efficiently.

#### Acceptance Criteria

1. THE Service_Desk SHALL display ticket queues including My Tickets, Team Tickets, and All Tickets
2. THE Service_Desk SHALL display ticket count metrics including Open, In Progress, Pending, Overdue, Resolved, and Closed
3. THE Service_Desk SHALL display SLA performance metrics including on-time resolution rate, average resolution time, and breach count
4. WHEN a user applies filters by Category, Priority, Status, Assigned To, Customer, or Policy, THE Service_Desk SHALL display only tickets matching all selected filters
5. WHEN a user searches by ticket number, customer name, policy number, or description, THE Service_Desk SHALL return matching tickets within 1 second
6. THE Service_Desk SHALL support sorting by created date, SLA deadline, priority, and status
7. THE Service_Desk SHALL provide quick actions including Create Ticket, Assign Ticket, Update Status, and Add Note
8. THE Service_Desk SHALL load within 2 seconds with up to 10,000 tickets

### Requirement 2: Ticket Creation from Customer 360

**User Story:** As a Service Agent, I want to create a service ticket from the Customer 360 view, so that I can quickly log customer requests during interactions.

#### Acceptance Criteria

1. WHEN a user clicks Create Ticket from Client_360_View, THE System SHALL open a ticket creation dialog with customer pre-filled
2. THE System SHALL display fields for Category, Priority, Policy, Description, Internal Notes, and Document Attachments
3. THE System SHALL validate that Category and Description are provided before allowing save
4. WHEN a user saves the ticket, THE System SHALL generate a unique ticket number in format TKT-XXXXX
5. WHEN a user saves the ticket, THE System SHALL calculate SLA_Deadline based on Category and Priority
6. WHEN a user saves the ticket, THE System SHALL apply Auto_Assignment rules to assign an owner
7. WHEN a user saves the ticket, THE System SHALL create an Activity_Log entry recording ticket creation
8. WHEN a user saves the ticket, THE System SHALL display a success message and navigate to Ticket Detail view

### Requirement 3: Ticket Creation from Policy Detail

**User Story:** As a Service Agent, I want to create a service ticket from the Policy Detail view, so that I can log policy-specific service requests.

#### Acceptance Criteria

1. WHEN a user clicks Create Ticket from Policy Detail view, THE System SHALL open a ticket creation dialog with customer and policy pre-filled
2. THE System SHALL display fields for Category, Priority, Description, Internal Notes, and Document Attachments
3. THE System SHALL validate that Category and Description are provided before allowing save
4. WHEN a user saves the ticket, THE System SHALL generate a unique ticket number in format TKT-XXXXX
5. WHEN a user saves the ticket, THE System SHALL calculate SLA_Deadline based on Category and Priority
6. WHEN a user saves the ticket, THE System SHALL apply Auto_Assignment rules to assign an owner
7. WHEN a user saves the ticket, THE System SHALL create an Activity_Log entry recording ticket creation
8. WHEN a user saves the ticket, THE System SHALL display a success message and navigate to Ticket Detail view

### Requirement 4: Manual Ticket Creation

**User Story:** As a Service Agent, I want to manually create a service ticket, so that I can log requests received through phone, email, or walk-in.

#### Acceptance Criteria

1. WHEN a user clicks Create Ticket from Service_Desk, THE System SHALL open a ticket creation form
2. THE System SHALL display fields for Customer, Policy, Category, Priority, Description, Internal Notes, and Document Attachments
3. THE System SHALL validate that Customer, Category, and Description are provided before allowing save
4. THE System SHALL allow searching and selecting existing customers
5. THE System SHALL allow searching and selecting policies linked to the selected customer
6. WHEN a user saves the ticket, THE System SHALL generate a unique ticket number in format TKT-XXXXX
7. WHEN a user saves the ticket, THE System SHALL calculate SLA_Deadline based on Category and Priority
8. WHEN a user saves the ticket, THE System SHALL apply Auto_Assignment rules to assign an owner
9. WHEN a user saves the ticket, THE System SHALL create an Activity_Log entry recording ticket creation
10. WHEN a user saves the ticket, THE System SHALL display a success message and navigate to Ticket Detail view

### Requirement 5: SLA Deadline Calculation

**User Story:** As a Service Manager, I want SLA deadlines to be automatically calculated based on category and priority, so that I can ensure consistent service standards.

#### Acceptance Criteria

1. WHEN a ticket is created with category ecard_request and priority urgent, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 4 Business_Hours
2. WHEN a ticket is created with category ecard_request and priority high, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 8 Business_Hours
3. WHEN a ticket is created with category ecard_request and priority medium, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 24 Business_Hours
4. WHEN a ticket is created with category ecard_request and priority low, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 48 Business_Hours
5. WHEN a ticket is created with category member_endorsement and priority urgent, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 8 Business_Hours
6. WHEN a ticket is created with category member_endorsement and priority high, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 24 Business_Hours
7. WHEN a ticket is created with category member_endorsement and priority medium, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 48 Business_Hours
8. WHEN a ticket is created with category member_endorsement and priority low, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 72 Business_Hours
9. WHEN a ticket is created with category general_query and priority urgent, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 4 Business_Hours
10. WHEN a ticket is created with category general_query and priority high, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 8 Business_Hours
11. WHEN a ticket is created with category general_query and priority medium, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 16 Business_Hours
12. WHEN a ticket is created with category general_query and priority low, THE SLA_Engine SHALL calculate SLA_Deadline as created_at plus 24 Business_Hours
13. THE SLA_Engine SHALL exclude weekends and holidays when calculating Business_Hours
14. THE SLA_Engine SHALL use business hours 9:00 AM to 6:00 PM Monday through Friday for Business_Hours calculation
15. FOR ALL tickets, THE SLA_Engine SHALL ensure that SLA_Deadline is always greater than created_at (invariant property)
16. FOR ALL tickets with identical category, priority, and created_at, THE SLA_Engine SHALL calculate identical SLA_Deadline values (deterministic property)
17. WHEN Business_Hours configuration is updated, THE SLA_Engine SHALL apply the new configuration only to tickets created after the update (temporal consistency property)

### Requirement 6: SLA Countdown Display

**User Story:** As a Service Agent, I want to see a real-time countdown to SLA deadline, so that I can prioritize urgent tickets.

#### Acceptance Criteria

1. THE Ticket Detail view SHALL display SLA_Countdown showing remaining time until SLA_Deadline
2. WHEN remaining time is greater than 25% of total SLA duration, THE System SHALL display SLA_Countdown in green
3. WHEN remaining time is between 10% and 25% of total SLA duration, THE System SHALL display SLA_Countdown in yellow
4. WHEN remaining time is less than 10% of total SLA duration, THE System SHALL display SLA_Countdown in red
5. WHEN current time exceeds SLA_Deadline, THE System SHALL display SLA_Countdown as "BREACHED" in red
6. THE System SHALL update SLA_Countdown every 60 seconds
7. THE Service_Desk ticket list SHALL display SLA_Countdown for each ticket
8. THE Service_Desk ticket list SHALL sort tickets by SLA_Countdown when sorted by urgency

### Requirement 7: SLA Breach Detection

**User Story:** As a Service Manager, I want to be alerted when tickets breach SLA, so that I can take corrective action.

#### Acceptance Criteria

1. WHEN current time exceeds SLA_Deadline for a ticket with status not equal to resolved and status not equal to closed, THE SLA_Engine SHALL mark the ticket as breached
2. WHEN a ticket is marked as breached, THE SLA_Engine SHALL create a notification for the ticket owner within 5 minutes
3. WHEN a ticket is marked as breached, THE SLA_Engine SHALL create a notification for the Service_Manager within 5 minutes
4. WHEN a ticket is marked as breached, THE SLA_Engine SHALL create an Activity_Log entry recording the breach
5. THE Service_Desk SHALL display breached tickets with a red "BREACHED" badge
6. THE Service_Desk SHALL provide a filter to show only breached tickets
7. THE SLA_Engine SHALL check for breaches every 5 minutes
8. FOR ALL tickets, THE System SHALL ensure that a ticket marked as breached has current_time greater than SLA_Deadline (breach correctness property)
9. FOR ALL tickets resolved before SLA_Deadline, THE System SHALL ensure that the ticket is never marked as breached (non-breach correctness property)
10. THE SLA_Engine SHALL detect breaches within 5 minutes of the breach occurring with 95% reliability

### Requirement 8: Ticket Detail View

**User Story:** As a Service Agent, I want to view comprehensive ticket details, so that I can understand the request and take appropriate action.

#### Acceptance Criteria

1. THE Ticket Detail view SHALL display ticket header including ticket number, category, priority, status, customer name, policy number, created date, and SLA_Deadline
2. THE Ticket Detail view SHALL display SLA_Countdown with visual indicators
3. THE Ticket Detail view SHALL display status timeline showing progression through open, in_progress, pending, resolved, and closed states
4. THE Ticket Detail view SHALL display Internal_Note section visible only to users with role admin, manager, or employee
5. THE Ticket Detail view SHALL display Customer_Note section visible to all users
6. THE Ticket Detail view SHALL display document attachments with download links
7. THE Ticket Detail view SHALL display Activity_Log in chronological order
8. THE Ticket Detail view SHALL provide quick actions including Update Status, Assign Owner, Add Note, Upload Document, and Escalate
9. THE Ticket Detail view SHALL load within 1 second

### Requirement 9: Internal Notes

**User Story:** As a Service Agent, I want to add internal notes to tickets, so that I can share information with colleagues without exposing it to customers.

#### Acceptance Criteria

1. WHEN a user with role admin, manager, or employee adds an Internal_Note, THE System SHALL save the note with visibility set to internal
2. THE System SHALL display Internal_Note only to users with role admin, manager, or employee
3. THE System SHALL prevent users with role customer from viewing Internal_Note
4. WHEN an Internal_Note is added, THE System SHALL create an Activity_Log entry recording the note addition
5. THE System SHALL display Internal_Note with author name and timestamp
6. THE System SHALL allow editing Internal_Note only by the original author or users with role admin
7. THE System SHALL allow deleting Internal_Note only by the original author or users with role admin

### Requirement 10: Customer Notes

**User Story:** As a Service Agent, I want to add customer-visible notes to tickets, so that I can communicate updates to customers.

#### Acceptance Criteria

1. WHEN a user adds a Customer_Note, THE System SHALL save the note with visibility set to customer
2. THE System SHALL display Customer_Note to all users including customers
3. WHEN a Customer_Note is added, THE System SHALL create an Activity_Log entry recording the note addition
4. WHEN a Customer_Note is added, THE System SHALL send a notification to the customer
5. THE System SHALL display Customer_Note with author name and timestamp
6. THE System SHALL allow editing Customer_Note only by the original author or users with role admin
7. THE System SHALL allow deleting Customer_Note only by the original author or users with role admin

### Requirement 11: Ticket Status Updates

**User Story:** As a Service Agent, I want to update ticket status, so that I can track progress toward resolution.

#### Acceptance Criteria

1. WHEN a user updates ticket status from open to in_progress, THE System SHALL record the status change and timestamp
2. WHEN a user updates ticket status from in_progress to pending, THE System SHALL record the status change and timestamp
3. WHEN a user updates ticket status from pending to in_progress, THE System SHALL record the status change and timestamp
4. WHEN a user updates ticket status from in_progress to resolved, THE System SHALL record the status change, timestamp, and resolution time
5. WHEN a user updates ticket status from resolved to closed, THE System SHALL record the status change and timestamp
6. WHEN a user updates ticket status to resolved, THE System SHALL calculate resolution time as resolved_at minus created_at
7. WHEN a user updates ticket status to resolved and resolution time is less than or equal to SLA_Deadline, THE System SHALL mark the ticket as resolved on time
8. WHEN a user updates ticket status to resolved and resolution time is greater than SLA_Deadline, THE System SHALL mark the ticket as resolved late
9. WHEN ticket status is updated, THE System SHALL create an Activity_Log entry recording the status change
10. WHEN ticket status is updated, THE System SHALL send a notification to the ticket owner
11. THE System SHALL enforce Valid_Status_Transition rules preventing invalid state changes
12. THE System SHALL reject status transitions from open to resolved (must go through in_progress)
13. THE System SHALL reject status transitions from pending to resolved (must go through in_progress)
14. THE System SHALL reject status transitions from closed to any other status (closed is terminal)
15. FOR ALL ticket status updates, THE System SHALL ensure that updated_at timestamp is greater than or equal to created_at (temporal invariant)
16. FOR ALL tickets, THE System SHALL ensure that a ticket can reach resolved status from open status through valid state transitions (reachability property)

### Requirement 12: Ticket Assignment

**User Story:** As a Service Manager, I want to assign tickets to agents, so that I can balance workload and ensure accountability.

#### Acceptance Criteria

1. WHEN a user manually assigns a ticket to an agent, THE System SHALL update the owner_id field
2. WHEN a ticket is assigned, THE System SHALL create an Activity_Log entry recording the assignment
3. WHEN a ticket is assigned, THE System SHALL send a notification to the assigned agent
4. THE System SHALL allow reassigning tickets to different agents
5. WHEN a ticket is reassigned, THE System SHALL create an Activity_Log entry recording the reassignment
6. WHEN a ticket is reassigned, THE System SHALL send a notification to the newly assigned agent
7. THE System SHALL display assigned agent name in the ticket list and detail views
8. THE System SHALL allow bulk assignment of multiple tickets to a single agent

### Requirement 13: Auto-Assignment Rules

**User Story:** As a Service Manager, I want tickets to be automatically assigned based on rules, so that I can ensure fair workload distribution.

#### Acceptance Criteria

1. WHEN a ticket is created and no owner is specified, THE System SHALL apply Auto_Assignment rules
2. WHERE auto-assignment mode is round-robin, THE System SHALL assign the ticket to the next agent in rotation
3. WHERE auto-assignment mode is workload-based, THE System SHALL assign the ticket to the agent with the fewest open tickets
4. WHERE auto-assignment mode is skill-based, THE System SHALL assign the ticket to an agent with matching category expertise
5. THE System SHALL exclude agents with status inactive from Auto_Assignment
6. THE System SHALL exclude agents on leave from Auto_Assignment
7. WHEN Auto_Assignment is applied, THE System SHALL create an Activity_Log entry recording the assignment
8. WHEN Auto_Assignment is applied, THE System SHALL send a notification to the assigned agent
9. WHERE auto-assignment mode is round-robin, FOR ALL sequences of N tickets assigned to M agents, THE System SHALL ensure that no agent receives more than ceiling(N/M) tickets (fairness property)
10. WHERE auto-assignment mode is workload-based, FOR ALL ticket assignments, THE System SHALL ensure that the assigned agent has the minimum open ticket count among all eligible agents (optimality property)
11. FOR ALL Auto_Assignment operations, THE System SHALL complete assignment within 2 seconds (performance property)

### Requirement 14: Escalation Rules

**User Story:** As a Service Manager, I want overdue tickets to be automatically escalated, so that I can ensure timely resolution.

#### Acceptance Criteria

1. WHEN current time exceeds SLA_Deadline plus 2 hours for a ticket with status not equal to resolved and status not equal to closed, THE System SHALL escalate the ticket to Escalation_Level 1
2. WHEN a ticket is escalated to Escalation_Level 1, THE System SHALL send a notification to users with role manager
3. WHEN a ticket is escalated to Escalation_Level 1, THE System SHALL create an Activity_Log entry recording the escalation
4. WHEN current time exceeds SLA_Deadline plus 4 hours for a ticket with status not equal to resolved and status not equal to closed, THE System SHALL escalate the ticket to Escalation_Level 2
5. WHEN a ticket is escalated to Escalation_Level 2, THE System SHALL send a notification to users with role admin
6. WHEN a ticket is escalated to Escalation_Level 2, THE System SHALL create an Activity_Log entry recording the escalation
7. THE System SHALL check for escalation conditions every 15 minutes
8. THE System SHALL display escalation level in the ticket list and detail views
9. THE System SHALL provide a filter to show only escalated tickets
10. FOR ALL tickets, THE System SHALL ensure that escalation_level never decreases (monotonicity property)
11. FOR ALL tickets escalated to level N, THE System SHALL ensure that the ticket was previously at level N-1 or met the criteria for level N (escalation path correctness)
12. THE System SHALL not escalate tickets that have already reached the maximum escalation level

### Requirement 15: Manual Escalation

**User Story:** As a Service Agent, I want to manually escalate tickets, so that I can request help for complex issues.

#### Acceptance Criteria

1. WHEN a user clicks Escalate on a ticket, THE System SHALL display an escalation dialog
2. THE System SHALL require the user to provide an escalation reason
3. WHEN a user confirms escalation, THE System SHALL escalate the ticket to Escalation_Level 1
4. WHEN a ticket is manually escalated, THE System SHALL send a notification to users with role manager
5. WHEN a ticket is manually escalated, THE System SHALL create an Activity_Log entry recording the escalation and reason
6. THE System SHALL allow users with role manager to escalate to Escalation_Level 2
7. WHEN a ticket is escalated to Escalation_Level 2, THE System SHALL send a notification to users with role admin

### Requirement 16: Queue Management

**User Story:** As a Service Agent, I want to view different ticket queues, so that I can focus on relevant tickets.

#### Acceptance Criteria

1. THE Service_Desk SHALL provide a My Tickets queue showing tickets where owner_id equals current user id
2. THE Service_Desk SHALL provide a Team Tickets queue showing tickets where owner belongs to current user team
3. THE Service_Desk SHALL provide an Unassigned queue showing tickets where owner_id is null
4. THE Service_Desk SHALL provide an All Tickets queue showing all tickets the user has permission to view
5. THE Service_Desk SHALL display Queue_Metrics for each queue including queue size, average wait time, and oldest ticket age
6. THE Service_Desk SHALL allow users to switch between queues without page reload
7. THE Service_Desk SHALL persist the selected queue in user preferences

### Requirement 17: Document Attachments

**User Story:** As a Service Agent, I want to attach documents to tickets, so that I can provide supporting information.

#### Acceptance Criteria

1. WHEN a user uploads a document to a ticket, THE System SHALL store the document in Supabase Storage
2. THE System SHALL validate that file size is less than 10 MB
3. THE System SHALL support file types including PDF, JPG, PNG, DOCX, and XLSX
4. WHEN a document is uploaded, THE System SHALL create an Activity_Log entry recording the upload
5. THE System SHALL display document attachments with file name, file size, upload date, and uploaded by
6. THE System SHALL allow users to download document attachments
7. THE System SHALL allow users with role admin to delete document attachments
8. WHEN a document is deleted, THE System SHALL create an Activity_Log entry recording the deletion

### Requirement 18: Activity Log

**User Story:** As a Service Agent, I want to view a complete activity log for tickets, so that I can understand the ticket history.

#### Acceptance Criteria

1. THE System SHALL create an Activity_Log entry for ticket creation
2. THE System SHALL create an Activity_Log entry for status changes
3. THE System SHALL create an Activity_Log entry for assignment changes
4. THE System SHALL create an Activity_Log entry for note additions
5. THE System SHALL create an Activity_Log entry for document uploads
6. THE System SHALL create an Activity_Log entry for escalations
7. THE System SHALL create an Activity_Log entry for SLA breaches
8. THE Activity_Log SHALL display entries in chronological order with newest first
9. THE Activity_Log SHALL display entry type, description, performed by, and timestamp for each entry
10. THE Activity_Log SHALL be read-only and not allow editing or deletion

### Requirement 19: Metrics Dashboard

**User Story:** As a Service Manager, I want to view service metrics, so that I can monitor team performance and identify improvement areas.

#### Acceptance Criteria

1. THE Service_Desk SHALL display ticket volume trends for daily, weekly, and monthly periods
2. THE Service_Desk SHALL display SLA performance metrics including on-time resolution rate, average resolution time, and breach count
3. THE Service_Desk SHALL display ticket breakdown by category
4. THE Service_Desk SHALL display ticket breakdown by priority
5. THE Service_Desk SHALL display ticket breakdown by status
6. THE Service_Desk SHALL display Agent_Performance metrics including tickets resolved, average resolution time, and SLA compliance rate
7. THE Service_Desk SHALL allow filtering metrics by date range, agent, category, and priority
8. THE Service_Desk SHALL allow exporting metrics as CSV or PDF
9. THE Service_Desk SHALL update metrics in real-time as tickets are created and updated
10. FOR ALL metrics calculations, THE System SHALL ensure that sum of category breakdowns equals total ticket count (conservation property)
11. FOR ALL metrics calculations, THE System SHALL ensure that on-time resolution rate is between 0% and 100% inclusive (range validity property)
12. THE Service_Desk SHALL calculate metrics with a maximum staleness of 5 minutes

### Requirement 20: SLA Configuration

**User Story:** As an Admin, I want to configure SLA deadlines by category and priority, so that I can adjust service standards.

#### Acceptance Criteria

1. THE System SHALL provide an SLA configuration interface accessible to users with role admin
2. THE System SHALL allow configuring SLA duration in hours for each combination of category and priority
3. THE System SHALL validate that SLA duration is a positive number
4. WHEN SLA configuration is updated, THE System SHALL apply new configuration to tickets created after the update
5. THE System SHALL not retroactively change SLA_Deadline for existing tickets
6. THE System SHALL log SLA configuration changes in the audit log
7. THE System SHALL display current SLA configuration in a table format

### Requirement 21: Business Hours Configuration

**User Story:** As an Admin, I want to configure business hours and holidays, so that SLA calculations reflect actual working time.

#### Acceptance Criteria

1. THE System SHALL provide a business hours configuration interface accessible to users with role admin
2. THE System SHALL allow configuring start time and end time for each day of the week
3. THE System SHALL allow marking specific dates as holidays
4. THE System SHALL exclude weekends from Business_Hours by default
5. THE System SHALL exclude configured holidays from Business_Hours
6. WHEN business hours configuration is updated, THE System SHALL apply new configuration to tickets created after the update
7. THE System SHALL log business hours configuration changes in the audit log

### Requirement 22: Ticket Search

**User Story:** As a Service Agent, I want to search for tickets, so that I can quickly find specific tickets.

#### Acceptance Criteria

1. WHEN a user searches by ticket number, THE System SHALL return exact match within 500 milliseconds
2. WHEN a user searches by customer name, THE System SHALL return partial matches within 1 second
3. WHEN a user searches by policy number, THE System SHALL return exact match within 500 milliseconds
4. WHEN a user searches by description, THE System SHALL return partial matches within 1 second
5. THE System SHALL highlight search terms in search results
6. THE System SHALL display search results with ticket number, customer name, category, priority, status, and SLA_Countdown
7. THE System SHALL allow clicking search results to navigate to Ticket Detail view

### Requirement 23: Ticket Filters

**User Story:** As a Service Agent, I want to filter tickets by multiple criteria, so that I can focus on specific ticket types.

#### Acceptance Criteria

1. THE Service_Desk SHALL provide filters for Category, Priority, Status, Assigned To, Customer, and Policy
2. WHEN multiple filters are applied, THE System SHALL display tickets matching all selected filters
3. THE System SHALL display filter count showing number of active filters
4. THE System SHALL allow clearing individual filters
5. THE System SHALL allow clearing all filters at once
6. THE System SHALL persist applied filters in user session
7. THE System SHALL update ticket list within 500 milliseconds when filters are applied

### Requirement 24: Performance Requirements

**User Story:** As a user, I want the system to respond quickly, so that I can work efficiently.

#### Acceptance Criteria

1. THE Service_Desk SHALL load within 2 seconds with up to 10,000 tickets
2. THE Ticket Detail view SHALL load within 1 second
3. WHEN a user performs a search, THE System SHALL return results within 1 second
4. WHEN a user applies filters, THE System SHALL update the display within 500 milliseconds
5. WHEN a user saves a ticket, THE System SHALL complete the save operation within 2 seconds
6. THE SLA_Engine SHALL update SLA_Countdown every 60 seconds without impacting UI responsiveness
7. THE System SHALL check for SLA breaches every 5 minutes without impacting UI responsiveness

### Requirement 25: Security and Access Control

**User Story:** As an Admin, I want to control access to service tickets, so that I can ensure data security and privacy.

#### Acceptance Criteria

1. THE System SHALL enforce role-based access control with roles admin, manager, and employee
2. THE System SHALL apply row-level security on tickets based on user role and team assignment
3. WHEN a user attempts to access a ticket they are not authorized to view, THE System SHALL deny access and log the attempt
4. THE System SHALL log all ticket create, update, and delete operations in the audit log
5. THE System SHALL enforce document access control allowing only authorized users to download documents
6. THE System SHALL display Internal_Note only to users with role admin, manager, or employee
7. THE System SHALL display Customer_Note to all users including customers

### Requirement 26: Notification System

**User Story:** As a Service Agent, I want to receive notifications for ticket events, so that I can stay informed.

#### Acceptance Criteria

1. WHEN a ticket is assigned to a user, THE System SHALL send a notification to the user
2. WHEN a ticket status is updated, THE System SHALL send a notification to the ticket owner
3. WHEN a ticket breaches SLA, THE System SHALL send a notification to the ticket owner and Service_Manager
4. WHEN a ticket is escalated, THE System SHALL send a notification to users at the escalation level
5. WHEN a Customer_Note is added, THE System SHALL send a notification to the customer
6. THE System SHALL display notifications in the notification center
7. THE System SHALL send email notifications for critical events including SLA breach and escalation
8. THE System SHALL allow users to configure notification preferences
9. FOR ALL notifications, THE System SHALL ensure that notification_timestamp is greater than or equal to event_timestamp (temporal correctness property)
10. THE System SHALL deduplicate notifications to prevent sending duplicate notifications for the same event within 5 minutes

### Requirement 27: Data Validation and Integrity

**User Story:** As an Admin, I want the system to validate data, so that I can maintain data quality.

#### Acceptance Criteria

1. THE System SHALL validate that ticket category is one of the allowed values
2. THE System SHALL validate that ticket priority is one of the allowed values
3. THE System SHALL validate that ticket status is one of the allowed values
4. THE System SHALL validate that customer_id references an existing customer
5. THE System SHALL validate that policy_id references an existing policy when provided
6. THE System SHALL validate that owner_id references an existing user when provided
7. WHEN validation fails, THE System SHALL display an inline error message indicating the expected format
8. THE System SHALL enforce referential integrity between tickets and customers, policies, and users

### Requirement 28: Soft Delete and Archival

**User Story:** As an Admin, I want to archive resolved tickets, so that I can maintain system performance while preserving historical data.

#### Acceptance Criteria

1. WHEN a ticket has status closed for more than 90 days, THE System SHALL mark the ticket as archived
2. THE Service_Desk SHALL exclude archived tickets from default views
3. THE Service_Desk SHALL provide an "Include Archived" filter to show archived tickets
4. THE System SHALL prevent hard deletion of ticket records
5. THE System SHALL allow users with role admin to manually archive tickets
6. WHEN a ticket is archived, THE System SHALL create an Activity_Log entry recording the archival

### Requirement 29: Ticket Number Generation and Uniqueness

**User Story:** As a System Administrator, I want ticket numbers to be unique and sequential, so that tickets can be reliably identified and referenced.

#### Acceptance Criteria

1. WHEN a ticket is created, THE Ticket_Number_Generator SHALL generate a unique ticket number in format TKT-XXXXX where XXXXX is a zero-padded 5-digit sequential number
2. THE Ticket_Number_Generator SHALL ensure that no two tickets have the same ticket number
3. THE Ticket_Number_Generator SHALL handle concurrent ticket creation without generating duplicate numbers
4. THE Ticket_Number_Generator SHALL start numbering from TKT-00001 for the first ticket
5. FOR ALL tickets, THE System SHALL enforce that ticket_number is unique across all ticket records (uniqueness invariant)
6. THE Ticket_Number_Generator SHALL complete number generation within 100 milliseconds

### Requirement 30: SLA Pause and Resume

**User Story:** As a Service Agent, I want to pause SLA countdown when waiting for customer response, so that SLA deadlines reflect actual service time.

#### Acceptance Criteria

1. WHEN a user updates ticket status to pending, THE SLA_Engine SHALL pause SLA countdown and record the pause timestamp
2. WHEN a user updates ticket status from pending to in_progress, THE SLA_Engine SHALL resume SLA countdown and adjust SLA_Deadline by adding the pause duration
3. THE System SHALL display SLA pause status in the Ticket Detail view
4. THE System SHALL display total pause duration in the Ticket Detail view
5. WHEN SLA is paused, THE SLA_Countdown SHALL display "PAUSED" instead of remaining time
6. FOR ALL tickets with SLA paused and resumed, THE System SHALL ensure that total_active_time plus total_pause_time equals elapsed_time (time accounting invariant)
7. THE System SHALL allow multiple pause and resume cycles for a single ticket

### Requirement 31: Bulk Ticket Operations

**User Story:** As a Service Manager, I want to perform bulk operations on tickets, so that I can efficiently manage multiple tickets.

#### Acceptance Criteria

1. WHEN a user selects multiple tickets, THE Service_Desk SHALL enable bulk actions including Bulk Assign, Bulk Update Status, Bulk Update Priority, and Bulk Export
2. WHEN a user performs Bulk Assign, THE System SHALL update owner_id for all selected tickets within 5 seconds for 100 tickets
3. WHEN a user performs Bulk Update Status, THE System SHALL validate that all selected tickets allow the target status transition
4. WHEN a user performs Bulk Update Priority, THE System SHALL recalculate SLA_Deadline for all selected tickets based on the new priority
5. WHEN a user performs Bulk Export, THE System SHALL generate a CSV file containing all selected ticket data within 10 seconds for 1000 tickets
6. THE System SHALL create Activity_Log entries for each ticket affected by bulk operations
7. THE System SHALL display a progress indicator during bulk operations
8. WHEN a bulk operation fails for some tickets, THE System SHALL display a summary showing successful updates, failed updates, and error details

### Requirement 32: Ticket Templates

**User Story:** As a Service Agent, I want to use ticket templates for common request types, so that I can create tickets faster with pre-filled information.

#### Acceptance Criteria

1. THE System SHALL provide a ticket template management interface accessible to users with role admin or manager
2. THE System SHALL allow creating templates with pre-filled values for Category, Priority, Description, and Internal Notes
3. WHEN a user creates a ticket from a template, THE System SHALL pre-fill the ticket form with template values
4. THE System SHALL allow users to modify template values before saving the ticket
5. THE System SHALL support templates for categories including ecard_request, member_endorsement, name_correction, address_correction, and general_query
6. THE System SHALL display available templates in the ticket creation dialog
7. THE System SHALL allow users with role admin to edit and delete templates

### Requirement 33: Queue Metrics Calculation

**User Story:** As a Service Manager, I want accurate queue metrics, so that I can monitor team performance and workload.

#### Acceptance Criteria

1. THE Service_Desk SHALL calculate queue size as the count of tickets in the queue
2. THE Service_Desk SHALL calculate average wait time as the mean time from ticket creation to first status change for tickets in the queue
3. THE Service_Desk SHALL calculate oldest ticket age as the time elapsed since creation for the oldest ticket in the queue
4. THE Service_Desk SHALL update Queue_Metrics every 5 minutes
5. FOR ALL queues, THE System SHALL ensure that sum of queue sizes equals total ticket count (conservation property)
6. THE Service_Desk SHALL display Queue_Metrics with precision of 1 decimal place for time values
7. THE Service_Desk SHALL handle empty queues by displaying zero for all metrics

### Requirement 34: Notification Delivery Guarantees

**User Story:** As a Service Agent, I want reliable notification delivery, so that I don't miss important ticket events.

#### Acceptance Criteria

1. WHEN a notification is triggered, THE System SHALL attempt to deliver the notification within 1 minute
2. IF notification delivery fails, THE System SHALL retry up to 3 times with exponential backoff
3. IF notification delivery fails after 3 retries, THE System SHALL log the failure and mark the notification as failed
4. THE System SHALL store all notifications in a notification queue with status pending, delivered, or failed
5. THE System SHALL allow users to view notification history in the notification center
6. THE System SHALL allow users to manually retry failed notifications
7. FOR ALL critical notifications (SLA breach, escalation), THE System SHALL ensure delivery within 5 minutes or log an alert (reliability property)

### Requirement 35: Business Hours Calculation Correctness

**User Story:** As a System Administrator, I want accurate business hours calculation, so that SLA deadlines are calculated correctly.

#### Acceptance Criteria

1. WHEN calculating Business_Hours between two timestamps, THE System SHALL exclude all hours outside the configured business hours window
2. WHEN calculating Business_Hours between two timestamps, THE System SHALL exclude all weekend days
3. WHEN calculating Business_Hours between two timestamps, THE System SHALL exclude all configured holidays
4. FOR ALL timestamp pairs (start, end) where start is before end, THE System SHALL ensure that calculated Business_Hours is non-negative (non-negativity invariant)
5. FOR ALL timestamp pairs (start, end), THE System SHALL ensure that Business_Hours(start, end) plus Business_Hours(end, start) equals zero when start equals end (identity property)
6. FOR ALL timestamp triples (start, mid, end) where start is before mid and mid is before end, THE System SHALL ensure that Business_Hours(start, mid) plus Business_Hours(mid, end) equals Business_Hours(start, end) (additivity property)
7. THE System SHALL handle daylight saving time transitions correctly in Business_Hours calculations

### Requirement 36: Escalation Timing Correctness

**User Story:** As a Service Manager, I want accurate escalation timing, so that tickets are escalated at the correct time.

#### Acceptance Criteria

1. THE System SHALL check for escalation conditions every 15 minutes with a maximum deviation of 1 minute
2. WHEN a ticket meets escalation criteria, THE System SHALL escalate the ticket within 5 minutes of meeting the criteria
3. THE System SHALL not escalate tickets that have been resolved or closed
4. THE System SHALL not escalate tickets that have already been escalated to the maximum level
5. FOR ALL tickets, THE System SHALL ensure that escalation_level is monotonically increasing (monotonicity property)
6. FOR ALL tickets, THE System SHALL ensure that escalation_timestamp is greater than or equal to SLA_Deadline plus escalation_delay (temporal correctness property)

### Requirement 37: Agent Performance Metrics Accuracy

**User Story:** As a Service Manager, I want accurate agent performance metrics, so that I can fairly evaluate team members.

#### Acceptance Criteria

1. THE System SHALL calculate tickets_resolved as the count of tickets resolved by the agent in the selected time period
2. THE System SHALL calculate average_resolution_time as the mean time from ticket creation to resolution for tickets resolved by the agent
3. THE System SHALL calculate sla_compliance_rate as the percentage of tickets resolved on time by the agent
4. THE System SHALL update Agent_Performance metrics every 1 hour
5. FOR ALL agents, THE System SHALL ensure that sum of tickets_resolved across all agents equals total resolved tickets (conservation property)
6. THE System SHALL exclude tickets resolved by other agents from an agent's performance metrics
7. THE System SHALL handle agents with zero resolved tickets by displaying "N/A" for average_resolution_time and sla_compliance_rate

### Requirement 38: Ticket Search Relevance

**User Story:** As a Service Agent, I want relevant search results, so that I can quickly find the tickets I'm looking for.

#### Acceptance Criteria

1. WHEN a user searches by ticket number, THE System SHALL rank exact matches first
2. WHEN a user searches by customer name, THE System SHALL rank partial matches by relevance score
3. WHEN a user searches by description, THE System SHALL use full-text search with stemming and ranking
4. THE System SHALL highlight matching terms in search results
5. THE System SHALL display search results sorted by relevance score descending
6. THE System SHALL limit search results to 50 tickets and provide pagination for additional results
7. THE System SHALL return search results within 1 second for searches across 10,000 tickets

---

## Notes

- All requirements follow EARS patterns (Ubiquitous, Event-driven, State-driven, Unwanted event, Optional feature, Complex)
- All requirements comply with INCOSE quality rules (clarity, testability, completeness, positive statements)
- Technical terms are defined in the Glossary
- Requirements are solution-free and focus on what the system should do, not how
- Implementation details will be specified in the Design document
- Property-based testing will be applied to correctness properties in the Tasks document
- SLA duration values are examples and can be configured by administrators
- Business hours default to 9:00 AM - 6:00 PM Monday-Friday but are configurable

## Correctness Properties for Property-Based Testing

The following correctness properties have been identified for property-based testing:

### Invariant Properties
1. **SLA Deadline Invariant**: For all tickets, SLA_Deadline > created_at
2. **Temporal Invariant**: For all tickets, updated_at >= created_at
3. **Escalation Monotonicity**: For all tickets, escalation_level never decreases
4. **Non-negativity**: Business_Hours calculation always returns non-negative values
5. **Uniqueness**: All ticket_number values are unique across all tickets
6. **Conservation**: Sum of queue sizes equals total ticket count
7. **Range Validity**: On-time resolution rate is between 0% and 100%

### Metamorphic Properties
1. **SLA Determinism**: Tickets with identical category, priority, and created_at have identical SLA_Deadline
2. **Time Accounting**: For paused tickets, total_active_time + total_pause_time = elapsed_time
3. **Breach Correctness**: Breached tickets have current_time > SLA_Deadline
4. **Non-breach Correctness**: Tickets resolved before SLA_Deadline are never marked as breached

### Additivity Properties
1. **Business Hours Additivity**: Business_Hours(start, mid) + Business_Hours(mid, end) = Business_Hours(start, end)
2. **Metrics Conservation**: Sum of category breakdowns equals total ticket count

### State Machine Properties
1. **Valid Transitions**: All status changes follow Valid_Status_Transition rules
2. **Reachability**: Tickets can reach resolved status from open status through valid transitions
3. **Terminal State**: Closed status is terminal (no transitions out)
4. **Escalation Path**: Tickets escalated to level N were previously at level N-1

### Fairness Properties
1. **Round-robin Fairness**: In round-robin mode, no agent receives more than ceiling(N/M) tickets for N tickets and M agents
2. **Workload Optimality**: In workload-based mode, assigned agent has minimum open ticket count

### Temporal Properties
1. **Notification Ordering**: notification_timestamp >= event_timestamp
2. **Escalation Timing**: escalation_timestamp >= SLA_Deadline + escalation_delay
3. **Temporal Consistency**: SLA configuration changes apply only to tickets created after the update

## Integration Points

### Phase 1 Integration
- Tickets link to Customer_Master via customer_id
- Tickets link to policies via policy_id
- Service_Ticket entries appear in Client_360_View Service Tickets tab
- Customer search and selection uses Phase 1 customer data

### Phase 3 Integration
- GMC-specific categories: ecard_request, member_endorsement
- Fleet-specific categories: validity_renewal, vehicle_endorsement
- Tickets can link to GMC_Member and Fleet_Vehicle entities
- E-card requests trigger GMC e-card generation workflow
- Validity renewal requests trigger Fleet validity update workflow
