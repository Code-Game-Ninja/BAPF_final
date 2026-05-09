# Requirements Document: Unified CRM Phase 4 - Advanced Features

## Introduction

The Unified CRM Phase 4 feature builds upon Phase 1 (Customer Master + Client 360), Phase 2 (Service Desk with SLA), and Phase 3 (GMC & Fleet Integration) to deliver the advanced business intelligence and automation layer for BP & AF Insurance Broker.

The system currently lacks:
- A dedicated Renewal Cockpit for proactive renewal pipeline management
- Multi-insurer Quote Comparison engine for competitive analysis
- Automated Commission Reconciliation against insurer statements
- IRDA Compliance Tracking and regulatory reporting

This phase transforms the platform into a complete insurance brokerage management system supporting:
- Renewal pipeline with risk scoring and automated follow-up workflows
- Side-by-side quote comparison across multiple insurers
- Commission statement import, matching, and discrepancy resolution
- IRDA compliance dashboard with regulatory report generation

## Glossary

- **System**: The BP & AF Insurance Broker CRM platform
- **Renewal_Cockpit**: The unified dashboard for managing all policy renewals
- **Renewal_Pipeline**: The collection of all policies due for renewal within a configurable window
- **Renewal_Risk_Score**: A calculated score (0–100) indicating the likelihood of policy lapse
- **Renewal_Stage**: The current state of a renewal (due, contacted, negotiating, renewed, lost)
- **Follow_Up_Task**: A scheduled action to contact a customer about renewal
- **Quote**: A premium estimate from an insurer for a given coverage
- **Quote_Request**: A request to obtain quotes from one or more insurers
- **Quote_Comparison**: A side-by-side view of quotes from multiple insurers
- **Quote_Matrix**: A structured table comparing insurer, premium, coverage, and terms
- **Commission_Statement**: An insurer-issued document listing commissions payable for a period
- **Commission_Reconciliation**: The process of matching commission statements against CRM records
- **Reconciliation_Run**: A single execution of the commission reconciliation process
- **Matched_Record**: A commission record where CRM data matches the insurer statement
- **Discrepancy**: A commission record where CRM data does not match the insurer statement
- **Discrepancy_Type**: The category of mismatch (amount_mismatch, policy_not_found, duplicate, missing_in_statement)
- **IRDA**: Insurance Regulatory and Development Authority of India
- **IRDA_Report**: A regulatory report submitted to IRDA
- **Compliance_Checklist**: A list of regulatory requirements with completion status
- **Compliance_Item**: A single regulatory requirement with due date and status
- **Compliance_Status**: The current state of a compliance item (pending, in_progress, completed, overdue)
- **Regulatory_Calendar**: A schedule of all IRDA reporting deadlines
- **Renewal_Conversion_Rate**: The percentage of due renewals that are successfully renewed
- **Lost_Renewal**: A renewal that was not converted within the renewal window
- **Renewal_Window**: The configurable number of days before policy expiry to begin renewal process
- **Commission_Rate**: The percentage or flat amount of commission for a policy type and insurer
- **Statement_Import**: The process of uploading and parsing a Commission_Statement file
- **Reconciliation_Status**: The current state of a reconciliation run (pending, processing, completed, failed)

## Requirements

### Requirement 1: Renewal Cockpit Dashboard

**User Story:** As a Manager, I want to view all upcoming renewals in a single dashboard, so that I can manage the renewal pipeline proactively.

#### Acceptance Criteria

1. THE Renewal_Cockpit SHALL display all policies in the Renewal_Pipeline grouped by Renewal_Stage
2. THE Renewal_Cockpit SHALL display summary metrics including total due, contacted, negotiating, renewed, and lost counts
3. THE Renewal_Cockpit SHALL display Renewal_Conversion_Rate for the current period
4. THE Renewal_Cockpit SHALL display total premium at risk and total premium renewed
5. WHEN a user applies filters by assigned RM, policy type, insurer, or customer type, THE Renewal_Cockpit SHALL display only renewals matching all selected filters
6. WHEN a user searches by customer name, policy number, or insurer, THE Renewal_Cockpit SHALL return matching renewals within 1 second
7. THE Renewal_Cockpit SHALL support sorting by expiry date, premium amount, Renewal_Risk_Score, and last contact date
8. THE Renewal_Cockpit SHALL load within 2 seconds with up to 5,000 renewals

### Requirement 2: Renewal Pipeline Configuration

**User Story:** As an Admin, I want to configure the renewal pipeline window, so that I can control when policies enter the renewal process.

#### Acceptance Criteria

1. THE System SHALL allow configuring Renewal_Window in days with a default of 90 days
2. THE System SHALL allow configuring separate Renewal_Window values for different policy types
3. WHEN a policy expiry date is within the Renewal_Window, THE System SHALL automatically add the policy to the Renewal_Pipeline
4. THE System SHALL validate that Renewal_Window is a positive integer between 1 and 365
5. WHEN Renewal_Window configuration is updated, THE System SHALL apply the new configuration to policies evaluated after the update
6. THE System SHALL log Renewal_Window configuration changes in the audit log

### Requirement 3: Renewal Risk Scoring

**User Story:** As a Manager, I want to see a risk score for each renewal, so that I can prioritize high-risk renewals.

#### Acceptance Criteria

1. THE System SHALL calculate Renewal_Risk_Score for each policy in the Renewal_Pipeline
2. THE Renewal_Risk_Score SHALL factor in days until expiry with higher score for fewer days remaining
3. THE Renewal_Risk_Score SHALL factor in customer payment history with higher score for overdue premiums
4. THE Renewal_Risk_Score SHALL factor in previous renewal conversion with higher score for previously lost renewals
5. THE Renewal_Risk_Score SHALL factor in customer engagement with higher score for no recent communication
6. THE Renewal_Risk_Score SHALL be a value between 0 and 100 where 100 represents highest risk
7. THE System SHALL display Renewal_Risk_Score with a color indicator: green for 0–33, yellow for 34–66, red for 67–100
8. THE System SHALL recalculate Renewal_Risk_Score every 24 hours
9. FOR ALL policies in the Renewal_Pipeline, THE System SHALL ensure Renewal_Risk_Score is between 0 and 100 inclusive (range invariant)

### Requirement 4: Renewal Stage Management

**User Story:** As an RM, I want to update the renewal stage for each policy, so that I can track progress through the renewal process.

#### Acceptance Criteria

1. THE System SHALL support Renewal_Stage values: due, contacted, negotiating, renewed, and lost
2. WHEN a user updates Renewal_Stage from due to contacted, THE System SHALL record the stage change and timestamp
3. WHEN a user updates Renewal_Stage from contacted to negotiating, THE System SHALL record the stage change and timestamp
4. WHEN a user updates Renewal_Stage from negotiating to renewed, THE System SHALL record the stage change, timestamp, and link to the new policy
5. WHEN a user updates Renewal_Stage from any stage to lost, THE System SHALL require the user to provide a lost reason
6. WHEN a Renewal_Stage is updated, THE System SHALL create an audit log entry recording the change
7. THE System SHALL prevent updating Renewal_Stage for policies with status renewed or lost back to earlier stages
8. THE System SHALL display Renewal_Stage history in the renewal detail view

### Requirement 5: Follow-Up Task Management

**User Story:** As an RM, I want to create and manage follow-up tasks for renewals, so that I can ensure timely customer contact.

#### Acceptance Criteria

1. WHEN a user creates a Follow_Up_Task for a renewal, THE System SHALL store task details including due date, task type, notes, and assigned to
2. THE System SHALL support task types including call, email, meeting, and whatsapp
3. WHEN a Follow_Up_Task due date arrives, THE System SHALL send a notification to the assigned user
4. THE System SHALL allow marking Follow_Up_Task as completed with completion notes
5. THE System SHALL allow rescheduling Follow_Up_Task to a new due date
6. THE Renewal_Cockpit SHALL display overdue Follow_Up_Task count per renewal
7. THE System SHALL allow viewing all Follow_Up_Task records for a renewal in chronological order
8. WHEN a Follow_Up_Task is completed, THE System SHALL update the last contact date for the renewal

### Requirement 6: Renewal Bulk Actions

**User Story:** As a Manager, I want to perform bulk actions on renewals, so that I can efficiently manage large renewal pipelines.

#### Acceptance Criteria

1. WHEN a user selects multiple renewals, THE Renewal_Cockpit SHALL enable bulk actions including Bulk Assign RM, Bulk Update Stage, and Bulk Export
2. WHEN a user performs Bulk Assign RM, THE System SHALL update the assigned RM for all selected renewals within 5 seconds for 100 renewals
3. WHEN a user performs Bulk Update Stage, THE System SHALL validate that all selected renewals allow the target stage transition
4. WHEN a user performs Bulk Export, THE System SHALL generate a CSV file containing all selected renewal data within 10 seconds for 1000 renewals
5. THE System SHALL create audit log entries for each renewal affected by bulk operations
6. THE System SHALL display a progress indicator during bulk operations
7. WHEN a bulk operation fails for some renewals, THE System SHALL display a summary showing successful updates, failed updates, and error details

### Requirement 7: Renewal Analytics

**User Story:** As a Manager, I want to view renewal analytics, so that I can identify trends and improve conversion rates.

#### Acceptance Criteria

1. THE Renewal_Cockpit SHALL display Renewal_Conversion_Rate trends for monthly and quarterly periods
2. THE Renewal_Cockpit SHALL display renewal breakdown by policy type
3. THE Renewal_Cockpit SHALL display renewal breakdown by insurer
4. THE Renewal_Cockpit SHALL display renewal breakdown by assigned RM
5. THE Renewal_Cockpit SHALL display Lost_Renewal analysis including top lost reasons
6. THE Renewal_Cockpit SHALL display average days to renewal from pipeline entry
7. THE Renewal_Cockpit SHALL allow filtering analytics by date range, policy type, insurer, and RM
8. THE Renewal_Cockpit SHALL allow exporting analytics as CSV or PDF
9. FOR ALL analytics calculations, THE System SHALL ensure that sum of stage counts equals total pipeline count (conservation property)

### Requirement 8: Quote Request Creation

**User Story:** As an RM, I want to create a quote request for a customer, so that I can obtain competitive quotes from multiple insurers.

#### Acceptance Criteria

1. WHEN a user creates a Quote_Request, THE System SHALL store request details including customer, policy type, coverage requirements, and target insurers
2. THE System SHALL generate a unique quote request number in format QR-XXXXX
3. THE System SHALL allow selecting multiple target insurers for a single Quote_Request
4. THE System SHALL allow attaching supporting documents to the Quote_Request
5. WHEN a Quote_Request is created, THE System SHALL create an audit log entry
6. THE System SHALL allow linking a Quote_Request to an existing renewal or lead
7. WHEN a Quote_Request is created, THE System SHALL send a notification to the assigned RM

### Requirement 9: Quote Entry and Management

**User Story:** As an RM, I want to enter quotes received from insurers, so that I can compare them for the customer.

#### Acceptance Criteria

1. WHEN a user adds a Quote to a Quote_Request, THE System SHALL store quote details including insurer name, premium amount, sum insured, coverage details, validity date, and terms
2. THE System SHALL allow adding multiple Quotes to a single Quote_Request
3. THE System SHALL validate that premium amount is a positive number
4. THE System SHALL validate that sum insured is a positive number
5. THE System SHALL validate that validity date is a future date
6. THE System SHALL allow attaching the insurer quote document to the Quote record
7. WHEN a Quote is added, THE System SHALL create an audit log entry
8. THE System SHALL allow editing Quote details before the Quote_Request is finalized

### Requirement 10: Quote Comparison Matrix

**User Story:** As an RM, I want to view a side-by-side comparison of quotes, so that I can recommend the best option to the customer.

#### Acceptance Criteria

1. THE Quote_Comparison view SHALL display all Quotes for a Quote_Request in a Quote_Matrix
2. THE Quote_Matrix SHALL display insurer name, premium amount, sum insured, coverage highlights, validity date, and terms for each Quote
3. THE Quote_Matrix SHALL highlight the lowest premium Quote
4. THE Quote_Matrix SHALL highlight the highest sum insured Quote
5. THE Quote_Matrix SHALL allow sorting by premium amount, sum insured, and insurer name
6. THE Quote_Matrix SHALL allow marking a Quote as recommended
7. THE System SHALL allow exporting the Quote_Matrix as PDF for customer presentation
8. THE Quote_Comparison view SHALL load within 1 second

### Requirement 11: Quote to Policy Conversion

**User Story:** As an RM, I want to convert an accepted quote to a policy, so that I can complete the sales process.

#### Acceptance Criteria

1. WHEN a user marks a Quote as accepted, THE System SHALL create a new Policy record pre-filled with quote details
2. THE System SHALL link the new Policy to the Quote_Request and accepted Quote
3. WHEN a Quote is converted to a Policy, THE System SHALL update the Quote_Request status to converted
4. WHEN a Quote is converted to a Policy, THE System SHALL create an audit log entry recording the conversion
5. THE System SHALL allow the user to review and edit policy details before saving
6. WHEN a Quote_Request is linked to a renewal, THE System SHALL update the Renewal_Stage to renewed upon policy creation

### Requirement 12: Commission Statement Import

**User Story:** As an Admin, I want to import commission statements from insurers, so that I can reconcile commissions against CRM records.

#### Acceptance Criteria

1. THE System SHALL provide a Commission_Statement import interface accessible to users with role admin or manager
2. THE System SHALL support importing Commission_Statement files in Excel and CSV formats
3. THE System SHALL validate that the file size is less than 20 MB
4. THE System SHALL validate that required columns Policy Number, Premium Amount, Commission Amount, and Commission Rate are present
5. WHEN a Commission_Statement is imported, THE System SHALL create a Reconciliation_Run record with status processing
6. THE System SHALL parse each row and attempt to match it to an existing Policy record by policy number
7. WHEN a Statement_Import completes, THE System SHALL update the Reconciliation_Run status to completed
8. WHEN a Statement_Import fails, THE System SHALL update the Reconciliation_Run status to failed and record the error
9. THE System SHALL complete Statement_Import processing within 60 seconds for 1000 records

### Requirement 13: Commission Reconciliation Engine

**User Story:** As an Admin, I want the system to automatically match commission records, so that I can identify discrepancies quickly.

#### Acceptance Criteria

1. WHEN a Commission_Statement row is matched to a Policy, THE System SHALL compare commission amount and rate against CRM records
2. WHEN commission amount matches within 1% tolerance, THE System SHALL mark the record as Matched_Record
3. WHEN commission amount differs by more than 1%, THE System SHALL mark the record as Discrepancy with type amount_mismatch
4. WHEN a Commission_Statement row cannot be matched to any Policy, THE System SHALL mark the record as Discrepancy with type policy_not_found
5. WHEN a Commission_Statement row matches a Policy already matched in the same Reconciliation_Run, THE System SHALL mark the record as Discrepancy with type duplicate
6. WHEN a CRM commission record has no matching row in the Commission_Statement, THE System SHALL mark the record as Discrepancy with type missing_in_statement
7. THE System SHALL calculate reconciliation summary including total records, matched count, discrepancy count, and total discrepancy amount
8. FOR ALL Reconciliation_Run records, THE System SHALL ensure that matched_count plus discrepancy_count equals total_records (conservation property)

### Requirement 14: Discrepancy Resolution

**User Story:** As an Admin, I want to resolve commission discrepancies, so that I can ensure accurate commission payments.

#### Acceptance Criteria

1. THE System SHALL display all Discrepancy records for a Reconciliation_Run with type, policy number, CRM amount, statement amount, and difference
2. WHEN a user resolves a Discrepancy, THE System SHALL require the user to select a resolution action: accept_statement, accept_crm, or escalate
3. WHEN a user selects accept_statement, THE System SHALL update the CRM commission record to match the statement amount
4. WHEN a user selects accept_crm, THE System SHALL mark the discrepancy as resolved with CRM value retained
5. WHEN a user selects escalate, THE System SHALL create a service ticket for the discrepancy and notify the manager
6. WHEN a Discrepancy is resolved, THE System SHALL create an audit log entry recording the resolution
7. THE System SHALL allow bulk resolution of discrepancies with the same type
8. THE System SHALL display resolution progress showing resolved and unresolved discrepancy counts

### Requirement 15: Commission Reconciliation Report

**User Story:** As an Admin, I want to generate a reconciliation report, so that I can share results with management and insurers.

#### Acceptance Criteria

1. THE System SHALL generate a reconciliation report for each Reconciliation_Run
2. THE reconciliation report SHALL include summary statistics: total records, matched, discrepancies by type, total amount matched, total discrepancy amount
3. THE reconciliation report SHALL include a detailed list of all Discrepancy records with resolution status
4. THE System SHALL allow exporting the reconciliation report as PDF or Excel
5. THE System SHALL allow filtering the reconciliation report by Discrepancy_Type and resolution status
6. THE System SHALL allow sharing the reconciliation report via email
7. THE System SHALL store reconciliation reports for a minimum of 7 years for regulatory compliance

### Requirement 16: Commission Analytics

**User Story:** As a Manager, I want to view commission analytics, so that I can monitor commission income and identify trends.

#### Acceptance Criteria

1. THE System SHALL display total commission earned by period (monthly, quarterly, annual)
2. THE System SHALL display commission breakdown by insurer
3. THE System SHALL display commission breakdown by policy type
4. THE System SHALL display commission breakdown by assigned RM
5. THE System SHALL display commission reconciliation accuracy rate (matched records / total records)
6. THE System SHALL display outstanding commission amount (approved but not yet paid)
7. THE System SHALL allow filtering analytics by date range, insurer, policy type, and RM
8. THE System SHALL allow exporting commission analytics as CSV or PDF

### Requirement 17: IRDA Compliance Dashboard

**User Story:** As an Admin, I want to view all IRDA compliance requirements in a single dashboard, so that I can ensure regulatory compliance.

#### Acceptance Criteria

1. THE System SHALL display a Compliance_Checklist showing all active Compliance_Item records
2. THE System SHALL display compliance summary metrics including total items, completed, in progress, pending, and overdue counts
3. THE System SHALL display a Regulatory_Calendar showing upcoming compliance deadlines for the next 90 days
4. WHEN a Compliance_Item due date is within 30 days, THE System SHALL highlight the item in yellow
5. WHEN a Compliance_Item due date is within 7 days, THE System SHALL highlight the item in red
6. WHEN a Compliance_Item is overdue, THE System SHALL display the item with an overdue badge
7. THE System SHALL allow filtering compliance items by Compliance_Status, category, and due date range
8. THE System SHALL load the compliance dashboard within 2 seconds

### Requirement 18: Compliance Item Management

**User Story:** As an Admin, I want to manage compliance items, so that I can track regulatory requirements and deadlines.

#### Acceptance Criteria

1. THE System SHALL allow creating Compliance_Item records with fields: title, category, description, due date, assigned to, and recurrence
2. THE System SHALL support compliance categories including license_renewal, regulatory_filing, audit_submission, training_certification, and policy_review
3. THE System SHALL support recurrence options including one_time, monthly, quarterly, half_yearly, and annual
4. WHEN a recurring Compliance_Item is completed, THE System SHALL automatically create the next occurrence with the next due date
5. THE System SHALL allow updating Compliance_Status to pending, in_progress, completed, or overdue
6. WHEN a Compliance_Item is completed, THE System SHALL require the user to upload a completion document
7. WHEN a Compliance_Item status is updated, THE System SHALL create an audit log entry
8. THE System SHALL allow assigning Compliance_Item to a specific user

### Requirement 19: IRDA Report Generation

**User Story:** As an Admin, I want to generate IRDA regulatory reports, so that I can submit required filings on time.

#### Acceptance Criteria

1. THE System SHALL support generating IRDA_Report types including business_summary, premium_register, commission_register, and claims_register
2. WHEN a user requests an IRDA_Report, THE System SHALL allow selecting the reporting period (monthly, quarterly, annual)
3. THE System SHALL generate the IRDA_Report in the required format (Excel or PDF) within 30 seconds
4. THE IRDA_Report SHALL include all required fields as per IRDA reporting guidelines
5. THE System SHALL validate that all required data is available before generating the report
6. WHEN an IRDA_Report is generated, THE System SHALL create an audit log entry recording the generation
7. THE System SHALL store generated IRDA_Report files for a minimum of 7 years
8. THE System SHALL allow downloading generated IRDA_Report files

### Requirement 20: Compliance Notifications

**User Story:** As an Admin, I want to receive notifications for upcoming compliance deadlines, so that I can take timely action.

#### Acceptance Criteria

1. WHEN a Compliance_Item due date is within 30 days, THE System SHALL send a notification to the assigned user
2. WHEN a Compliance_Item due date is within 7 days, THE System SHALL send a notification to the assigned user and users with role admin
3. WHEN a Compliance_Item becomes overdue, THE System SHALL send a notification to the assigned user and users with role admin
4. THE System SHALL check for upcoming compliance deadlines every 24 hours
5. THE System SHALL send email notifications for compliance items due within 7 days
6. THE System SHALL allow users to configure notification preferences for compliance alerts
7. THE System SHALL display compliance notifications in the notification center

### Requirement 21: Renewal Notification Automation

**User Story:** As a Manager, I want automated renewal notifications to be sent to customers, so that I can improve renewal conversion rates.

#### Acceptance Criteria

1. WHEN a policy enters the Renewal_Pipeline, THE System SHALL automatically send a renewal reminder to the customer
2. THE System SHALL send renewal reminders at 90 days, 60 days, 30 days, 15 days, and 7 days before expiry
3. THE System SHALL support renewal reminder channels including email, SMS, and WhatsApp
4. THE System SHALL allow configuring renewal reminder templates per policy type
5. WHEN a renewal reminder is sent, THE System SHALL create a communication log entry
6. THE System SHALL allow disabling automated renewal reminders for specific customers
7. THE System SHALL track renewal reminder delivery status and display in the Renewal_Cockpit

### Requirement 22: Quote Expiry Management

**User Story:** As an RM, I want to be notified when quotes are about to expire, so that I can follow up with customers before quotes lapse.

#### Acceptance Criteria

1. WHEN a Quote validity date is within 7 days, THE System SHALL send a notification to the assigned RM
2. WHEN a Quote validity date is within 3 days, THE System SHALL send a notification to the assigned RM and manager
3. WHEN a Quote validity date passes without conversion, THE System SHALL mark the Quote as expired
4. WHEN a Quote is marked as expired, THE System SHALL update the Quote_Request status to expired if all quotes are expired
5. THE System SHALL display expired quotes with an expired badge in the Quote_Comparison view
6. THE System SHALL allow requesting a quote extension from the insurer

### Requirement 23: Commission Rate Configuration

**User Story:** As an Admin, I want to configure commission rates by insurer and policy type, so that I can accurately calculate expected commissions.

#### Acceptance Criteria

1. THE System SHALL provide a commission rate configuration interface accessible to users with role admin
2. THE System SHALL allow configuring Commission_Rate by insurer name and policy type
3. THE System SHALL support commission rate types: percentage and flat amount
4. THE System SHALL validate that commission rate percentage is between 0 and 100
5. THE System SHALL validate that flat commission amount is a positive number
6. WHEN Commission_Rate configuration is updated, THE System SHALL apply the new rate to policies created after the update
7. THE System SHALL not retroactively change commission amounts for existing policies
8. THE System SHALL log commission rate configuration changes in the audit log
9. THE System SHALL display current commission rate configuration in a table format

### Requirement 24: Performance Requirements

**User Story:** As a user, I want the system to respond quickly, so that I can work efficiently.

#### Acceptance Criteria

1. THE Renewal_Cockpit SHALL load within 2 seconds with up to 5,000 renewals
2. THE Quote_Comparison view SHALL load within 1 second
3. THE Commission reconciliation engine SHALL process 1,000 records within 60 seconds
4. THE IRDA_Report generation SHALL complete within 30 seconds
5. WHEN a user performs a search in the Renewal_Cockpit, THE System SHALL return results within 1 second
6. WHEN a user applies filters in the Renewal_Cockpit, THE System SHALL update the display within 500 milliseconds
7. THE Compliance dashboard SHALL load within 2 seconds

### Requirement 25: Security and Access Control

**User Story:** As an Admin, I want to control access to advanced features, so that I can ensure data security and compliance.

#### Acceptance Criteria

1. THE System SHALL enforce role-based access control with roles admin, manager, and employee
2. THE System SHALL restrict Commission_Statement import to users with role admin or manager
3. THE System SHALL restrict IRDA_Report generation to users with role admin
4. THE System SHALL restrict Commission_Rate configuration to users with role admin
5. WHEN a user attempts to access a feature they are not authorized to use, THE System SHALL deny access and log the attempt
6. THE System SHALL log all commission reconciliation operations in the audit log
7. THE System SHALL log all IRDA report generation operations in the audit log
8. THE System SHALL apply row-level security on commission records based on user role

### Requirement 26: Data Validation and Integrity

**User Story:** As an Admin, I want the system to validate data, so that I can maintain data quality.

#### Acceptance Criteria

1. THE System SHALL validate that Quote premium amount is a positive number
2. THE System SHALL validate that Commission_Statement amounts are positive numbers
3. THE System SHALL validate that Compliance_Item due date is a valid future date for new items
4. THE System SHALL validate that Renewal_Window is a positive integer
5. WHEN validation fails, THE System SHALL display an inline error message indicating the expected format
6. THE System SHALL enforce referential integrity between Quote_Request and Customer, Policy, and Lead records
7. THE System SHALL enforce referential integrity between Commission_Statement and Insurer records

### Requirement 27: Audit Logging

**User Story:** As an Admin, I want comprehensive audit logging, so that I can track all changes to advanced feature data.

#### Acceptance Criteria

1. THE System SHALL create an audit log entry for Quote_Request creation and updates
2. THE System SHALL create an audit log entry for Quote creation and updates
3. THE System SHALL create an audit log entry for Commission_Statement imports
4. THE System SHALL create an audit log entry for Discrepancy resolutions
5. THE System SHALL create an audit log entry for Compliance_Item creation and updates
6. THE System SHALL create an audit log entry for IRDA_Report generation
7. THE System SHALL create an audit log entry for Commission_Rate configuration changes
8. THE audit log SHALL include timestamp, user, action type, record type, record ID, and changes made

### Requirement 28: Integration with Previous Phases

**User Story:** As a System Administrator, I want Phase 4 features to integrate with Phases 1–3, so that data flows seamlessly across the platform.

#### Acceptance Criteria

1. THE Renewal_Cockpit SHALL source renewal data from Policy records created in Phase 1
2. THE Renewal_Cockpit SHALL display customer information from Customer_Master created in Phase 1
3. WHEN a Quote is converted to a Policy, THE System SHALL link the Policy to the Customer_Master record
4. THE Commission reconciliation engine SHALL match Commission_Statement records against Policy records from Phase 1
5. WHEN a commission discrepancy is escalated, THE System SHALL create a Service_Ticket using the Phase 2 Service Desk
6. THE Compliance_Checklist SHALL include compliance items related to GMC and Fleet operations from Phase 3
7. THE IRDA_Report SHALL include data from all policy types including GMC and Fleet policies from Phase 3

---

## Notes

- All requirements follow EARS patterns (Ubiquitous, Event-driven, State-driven, Unwanted event, Optional feature, Complex)
- All requirements comply with INCOSE quality rules (clarity, testability, completeness, positive statements)
- Technical terms are defined in the Glossary
- Requirements are solution-free and focus on what the system should do, not how
- Implementation details will be specified in the Design document
- Property-based testing will be applied to correctness properties in the Tasks document

## Correctness Properties for Property-Based Testing

### Invariant Properties
1. **Risk Score Range**: For all renewals, Renewal_Risk_Score is between 0 and 100 inclusive
2. **Reconciliation Conservation**: For all Reconciliation_Run records, matched_count + discrepancy_count = total_records
3. **Analytics Conservation**: Sum of stage counts equals total pipeline count
4. **Commission Rate Range**: Commission rate percentage is between 0 and 100

### Metamorphic Properties
1. **Renewal Stage Monotonicity**: Renewal_Stage cannot transition backward from renewed or lost
2. **SLA Deadline Invariant**: Quote validity date is always in the future when created
3. **Reconciliation Determinism**: Same Commission_Statement imported twice produces identical reconciliation results

### Temporal Properties
1. **Audit Ordering**: All audit log entries have timestamp >= event timestamp
2. **Compliance Recurrence**: Next occurrence due date is always after current occurrence due date
3. **Commission Rate Temporal Consistency**: Rate changes apply only to policies created after the change
