# Requirements Document: Unified CRM Phase 1

## Introduction

The Unified CRM Phase 1 feature transforms the BP & AF Insurance Broker platform into an industry-grade insurance CRM with a unified customer master. This phase establishes the foundation for managing all customer types (Individual, Corporate, SME, Government, Contractor, etc.) from a single source of truth, with comprehensive customer data management, family/corporate member structures, and a 360-degree client view.

The system currently supports basic customer CRUD operations with simple fields. This phase extends the platform to support:
- Unified customer registry (All Entities page)
- Customer type-specific metadata and fields
- Family member management for individual customers
- Corporate member management for corporate customers
- Manual customer creation with full depth
- Client 360 view consolidating all customer interactions, policies, claims, documents, and communications

## Glossary

- **System**: The BP & AF Insurance Broker CRM platform
- **All_Entities_Page**: The unified customer registry displaying all customer types
- **Customer_Master**: The single source of truth for all customer data
- **Individual_Customer**: A retail customer purchasing personal insurance (health, motor, life)
- **Corporate_Customer**: A business entity purchasing group insurance (GMC, fleet, commercial)
- **SME_Customer**: A small/medium enterprise customer
- **Family_Member**: A person related to an Individual_Customer (spouse, child, parent, etc.)
- **Corporate_Member**: An employee, contact, or point-of-contact associated with a Corporate_Customer
- **Client_360_View**: A comprehensive dashboard displaying all customer interactions, policies, claims, documents, and communications
- **RM**: Relationship Manager - the user assigned to manage a customer account
- **KYC**: Know Your Customer - identity verification documents
- **Entity_Metadata**: JSONB field storing customer type-specific data
- **Customer_UID**: A unique 4-digit identifier for each customer (e.g., "C-1234")
- **Business_Case**: A sales or service workflow (lead, quote, proposal, renewal, endorsement, claim, servicing)
- **Service_Ticket**: A customer service request (ecard, endorsement, correction, query, etc.)
- **Document_Registry**: The collection of all documents linked to a customer
- **Communication_Timeline**: The chronological history of all communications with a customer
- **Duplicate_Detection**: The process of identifying existing customers by phone, email, PAN, or GST
- **Soft_Delete**: Marking a customer as inactive without removing data from the database

## Requirements

### Requirement 1: Unified Customer Registry

**User Story:** As an Admin or Manager, I want to view all customers in a unified list, so that I can manage all customer types from one central location.

#### Acceptance Criteria

1. THE All_Entities_Page SHALL display all customers regardless of customer type
2. WHEN a user searches by name, Customer_UID, phone, email, city, PAN, or GST, THE All_Entities_Page SHALL return matching customers within 1 second
3. WHEN a user applies filters by customer type, status, assigned RM, city, or state, THE All_Entities_Page SHALL display only customers matching all selected filters
4. THE All_Entities_Page SHALL support sorting by name, created date, and last activity date
5. THE All_Entities_Page SHALL display key metrics including total customer count, active customer count, and customer count by type
6. THE All_Entities_Page SHALL support pagination with 20 customers per page
7. WHEN a user selects multiple customers, THE All_Entities_Page SHALL enable bulk actions including export, bulk assign RM, and bulk status change
8. THE All_Entities_Page SHALL allow users to customize visible columns
9. THE All_Entities_Page SHALL allow users to save custom filter and column configurations as named views
10. THE All_Entities_Page SHALL provide quick actions for each customer including View, Edit, Deactivate, Create Policy, and Create Case

### Requirement 2: Customer Type Support

**User Story:** As an Admin or Manager, I want to create customers with different types, so that I can capture type-specific information for individuals, corporates, SMEs, and other entities.

#### Acceptance Criteria

1. THE System SHALL support customer types including individual, corporate, sme, government, contractor, manufacturer, transporter, trader, and other
2. WHEN a customer is created with type individual, THE System SHALL store Entity_Metadata conforming to IndividualEntityMetadata schema
3. WHEN a customer is created with type corporate, THE System SHALL store Entity_Metadata conforming to CorporateEntityMetadata schema
4. THE System SHALL validate that Entity_Metadata matches the customer type before saving
5. WHEN a customer type is changed, THE System SHALL prompt the user to confirm data migration and update Entity_Metadata accordingly

### Requirement 3: Manual Add Individual Customer

**User Story:** As an Admin or Manager, I want to manually add an individual customer with full details, so that I can capture all relevant information for retail insurance.

#### Acceptance Criteria

1. WHEN a user selects customer type individual, THE System SHALL display fields for Full Name, Mobile, Email, Profile Image, and Assigned RM
2. THE System SHALL display advance detail fields including State, City, Address, Birth Place, Birth Date, Age, Gender, Height, Weight, Education, Marital Status, Business/Job, Name of Business/Job, Type of Duty/Occupation, Annual Income, PAN, GST, Aadhaar, and Additional Info
3. WHEN a user enters Birth Date, THE System SHALL automatically calculate and display Age
4. THE System SHALL allow users to add multiple family member rows with fields Name, Relationship, DOB, Gender, Mobile, and Notes
5. THE System SHALL allow users to add multiple document upload rows with fields Document Type and File Upload
6. THE System SHALL validate that Full Name and Mobile are provided before allowing save
7. THE System SHALL validate email format, PAN format, GST format, and Aadhaar format when provided
8. WHEN a user saves an individual customer, THE System SHALL create the customer record, link family members, upload documents, display a success message, and navigate to Customer Detail or All Entities page

### Requirement 4: Manual Add Corporate Customer

**User Story:** As an Admin or Manager, I want to manually add a corporate customer with full details, so that I can capture all relevant information for group insurance.

#### Acceptance Criteria

1. WHEN a user selects customer type corporate, THE System SHALL display fields for Company Name, Mobile, Email, Profile Image, and Assigned RM
2. THE System SHALL display advance detail fields including State, City, Address, Annual Income/Turnover, PAN, GST, Industry Type, Incorporation Date, Employee Count, POC Alt Phone, and Additional Info
3. THE System SHALL allow users to add multiple corporate member rows with fields Name, Designation, Department, Email, Mobile, Role, Branch/Location, and Notes
4. THE System SHALL allow users to add multiple document upload rows with fields Document Type and File Upload
5. THE System SHALL validate that Company Name and Mobile are provided before allowing save
6. THE System SHALL validate email format, PAN format, and GST format when provided
7. WHEN a user saves a corporate customer, THE System SHALL create the customer record, link corporate members, upload documents, display a success message, and navigate to Customer Detail or All Entities page

### Requirement 5: Family Member Management

**User Story:** As an Admin or Manager, I want to add, edit, and remove family members for an individual customer, so that I can track family relationships for family floater policies.

#### Acceptance Criteria

1. WHEN a customer has type individual, THE System SHALL allow adding family members with fields Name, Relationship, DOB, Gender, Mobile, and Notes
2. THE System SHALL allow editing existing family members
3. THE System SHALL allow removing family members
4. THE Client_360_View Contacts tab SHALL display all family members for Individual_Customer
5. WHEN a family member is linked to a policy, THE System SHALL prevent deletion and display a warning message

### Requirement 6: Corporate Member Management

**User Story:** As an Admin or Manager, I want to add, edit, and remove corporate members for a corporate customer, so that I can track employees, contacts, and POCs for group insurance.

#### Acceptance Criteria

1. WHEN a customer has type corporate, THE System SHALL allow adding corporate members with fields Name, Designation, Department, Email, Mobile, Role, Branch/Location, and Notes
2. THE System SHALL allow editing existing corporate members
3. THE System SHALL allow removing corporate members
4. THE Client_360_View Contacts tab SHALL display all corporate members for Corporate_Customer
5. WHEN a corporate member is linked to a policy, THE System SHALL prevent deletion and display a warning message

### Requirement 7: Client 360 Profile Summary

**User Story:** As a user, I want to view a comprehensive profile summary for a customer, so that I can quickly understand their basic information and status.

#### Acceptance Criteria

1. THE Client_360_View SHALL display customer name, Customer_UID, type, status, assigned RM, contact info, address, KYC status, created date, and last activity date
2. THE Client_360_View SHALL be accessible from the All_Entities_Page View action
3. THE Client_360_View SHALL be accessible from the Customer Detail page
4. THE Client_360_View SHALL load within 3 seconds
5. WHEN customer data is updated, THE Client_360_View SHALL reflect changes immediately upon refresh

### Requirement 8: Client 360 Contacts Tab

**User Story:** As a user, I want to view all contacts associated with a customer, so that I can manage family members or corporate members.

#### Acceptance Criteria

1. WHEN a customer has type individual, THE Client_360_View Contacts tab SHALL display all Family_Member records
2. WHEN a customer has type corporate, THE Client_360_View Contacts tab SHALL display all Corporate_Member records
3. THE Client_360_View Contacts tab SHALL allow adding new contacts
4. THE Client_360_View Contacts tab SHALL allow editing existing contacts
5. THE Client_360_View Contacts tab SHALL allow removing contacts not linked to policies

### Requirement 9: Client 360 Policies Tab

**User Story:** As a user, I want to view all policies linked to a customer, so that I can understand their insurance coverage.

#### Acceptance Criteria

1. THE Client_360_View Policies tab SHALL display all policies linked to the customer including active, expired, and cancelled policies
2. THE Client_360_View Policies tab SHALL support filtering by policy status, policy type, and insurer name
3. THE Client_360_View Policies tab SHALL support searching by policy number
4. THE Client_360_View Policies tab SHALL provide quick actions including View Policy, Create Renewal, Create Endorsement, and Create Claim
5. THE Client_360_View Policies tab SHALL display policy number, type, insurer, start date, end date, premium amount, and status for each policy

### Requirement 10: Client 360 Cases Tab

**User Story:** As a user, I want to view all business cases linked to a customer, so that I can track sales and service workflows.

#### Acceptance Criteria

1. THE Client_360_View Cases tab SHALL display all Business_Case records linked to the customer
2. THE Client_360_View Cases tab SHALL display case number, case type, status, priority, assigned to, and SLA deadline for each case
3. THE Client_360_View Cases tab SHALL support filtering by case type, status, and priority
4. THE Client_360_View Cases tab SHALL support sorting by created date, SLA deadline, and priority
5. THE Client_360_View Cases tab SHALL provide quick actions including View Case, Update Status, and Assign Owner

### Requirement 11: Client 360 Claims Tab

**User Story:** As a user, I want to view all claims linked to a customer, so that I can track claim status and settlement.

#### Acceptance Criteria

1. THE Client_360_View Claims tab SHALL display all claims linked to the customer
2. THE Client_360_View Claims tab SHALL display claim number, policy number, claim type, claim amount, settled amount, status, and settlement date for each claim
3. THE Client_360_View Claims tab SHALL support filtering by claim status and claim type
4. THE Client_360_View Claims tab SHALL support sorting by claim date and settlement date
5. THE Client_360_View Claims tab SHALL provide quick actions including View Claim, Update Status, and Upload Document

### Requirement 12: Client 360 Service Tickets Tab

**User Story:** As a user, I want to view all service tickets linked to a customer, so that I can track customer service requests.

#### Acceptance Criteria

1. THE Client_360_View Service Tickets tab SHALL display all Service_Ticket records linked to the customer
2. THE Client_360_View Service Tickets tab SHALL display ticket number, category, priority, status, owner, and SLA deadline for each ticket
3. THE Client_360_View Service Tickets tab SHALL support filtering by category, priority, and status
4. THE Client_360_View Service Tickets tab SHALL support sorting by created date and SLA deadline
5. THE Client_360_View Service Tickets tab SHALL provide quick actions including View Ticket, Update Status, and Assign Owner

### Requirement 13: Client 360 Documents Tab

**User Story:** As a user, I want to view all documents linked to a customer, so that I can access KYC documents, policy documents, and claim documents.

#### Acceptance Criteria

1. THE Client_360_View Documents tab SHALL display all documents from Document_Registry linked to the customer
2. THE Client_360_View Documents tab SHALL display document type, file name, upload date, uploaded by, and file size for each document
3. THE Client_360_View Documents tab SHALL support filtering by document type
4. THE Client_360_View Documents tab SHALL support sorting by upload date
5. THE Client_360_View Documents tab SHALL provide actions including Download, View, and Delete for each document
6. WHEN a user clicks Download, THE System SHALL download the document file
7. THE Client_360_View Documents tab SHALL allow uploading new documents

### Requirement 14: Client 360 Communication History

**User Story:** As a user, I want to view all communications with a customer, so that I can understand the communication history.

#### Acceptance Criteria

1. THE Client_360_View Communication History SHALL display all communication logs linked to the customer in chronological order
2. THE Client_360_View Communication History SHALL display date, channel, subject, status, and recipient for each communication
3. THE Client_360_View Communication History SHALL support filtering by channel and status
4. THE Client_360_View Communication History SHALL support searching by subject or body content
5. THE Client_360_View Communication History SHALL provide actions including View Details and Resend for each communication

### Requirement 15: Client 360 Financial Summary

**User Story:** As a user, I want to view financial metrics for a customer, so that I can understand their account value and profitability.

#### Acceptance Criteria

1. THE Client_360_View Financial Summary SHALL display total premium paid across all policies
2. THE Client_360_View Financial Summary SHALL display outstanding premium amount
3. THE Client_360_View Financial Summary SHALL display total commission earned from the customer
4. WHERE account profitability tracking is enabled, THE Client_360_View Financial Summary SHALL display account profitability metrics
5. THE Client_360_View Financial Summary SHALL update when new policies, premiums, or commissions are added

### Requirement 16: Client 360 Renewal Risk

**User Story:** As a user, I want to view renewal risk indicators for a customer, so that I can proactively manage renewals.

#### Acceptance Criteria

1. THE Client_360_View Renewal Risk SHALL display upcoming renewals within the next 90 days
2. THE Client_360_View Renewal Risk SHALL display renewal conversion rate for the customer
3. THE Client_360_View Renewal Risk SHALL display lost renewals count
4. THE Client_360_View Renewal Risk SHALL highlight high-risk renewals based on customer engagement and payment history
5. THE Client_360_View Renewal Risk SHALL provide quick actions including Contact Customer and Create Renewal Case

### Requirement 17: Client 360 Service Issues

**User Story:** As a user, I want to view service issue metrics for a customer, so that I can identify and resolve service problems.

#### Acceptance Criteria

1. THE Client_360_View Service Issues SHALL display count of open service tickets
2. THE Client_360_View Service Issues SHALL display count of overdue service tickets
3. THE Client_360_View Service Issues SHALL display count of escalated service tickets
4. THE Client_360_View Service Issues SHALL highlight customers with multiple overdue tickets
5. THE Client_360_View Service Issues SHALL provide quick actions including View All Tickets and Create New Ticket

### Requirement 18: Client 360 Insurer Relationships

**User Story:** As a user, I want to view insurer relationships for a customer, so that I can understand which insurers the customer works with.

#### Acceptance Criteria

1. THE Client_360_View Insurer Relationships SHALL display policy count by insurer
2. THE Client_360_View Insurer Relationships SHALL display claim count by insurer
3. THE Client_360_View Insurer Relationships SHALL display TPA mappings for health policies
4. THE Client_360_View Insurer Relationships SHALL support filtering by insurer name
5. THE Client_360_View Insurer Relationships SHALL provide quick actions including View Policies by Insurer and View Claims by Insurer

### Requirement 19: Client 360 Quick Actions

**User Story:** As a user, I want to perform quick actions from the Client 360 view, so that I can efficiently manage customer interactions.

#### Acceptance Criteria

1. THE Client_360_View SHALL provide quick actions including Create Policy, Create Case, Create Ticket, Send Communication, and Upload Document
2. WHEN a user clicks Create Policy, THE System SHALL navigate to the policy creation page with customer pre-filled
3. WHEN a user clicks Create Case, THE System SHALL navigate to the business case creation page with customer pre-filled
4. WHEN a user clicks Create Ticket, THE System SHALL navigate to the service ticket creation page with customer pre-filled
5. WHEN a user clicks Send Communication, THE System SHALL open a communication dialog with customer pre-filled
6. WHEN a user clicks Upload Document, THE System SHALL open a document upload dialog with customer pre-filled

### Requirement 20: Duplicate Detection

**User Story:** As an Admin or Manager, I want to be warned when creating a duplicate customer, so that I can avoid creating duplicate records.

#### Acceptance Criteria

1. WHEN a user creates a new customer, THE System SHALL check for existing customers with matching phone, email, PAN, or GST
2. IF an existing customer is found with matching phone, THE System SHALL display a duplicate warning with the existing customer details
3. IF an existing customer is found with matching email, THE System SHALL display a duplicate warning with the existing customer details
4. IF an existing customer is found with matching PAN, THE System SHALL display a duplicate warning with the existing customer details
5. IF an existing customer is found with matching GST, THE System SHALL display a duplicate warning with the existing customer details
6. THE System SHALL allow the user to proceed with creation, merge with existing customer, or cancel
7. THE duplicate detection check SHALL complete within 500 milliseconds

### Requirement 21: Soft Delete and Cascade

**User Story:** As an Admin or Manager, I want to deactivate customers instead of deleting them, so that I can preserve historical data.

#### Acceptance Criteria

1. WHEN a user deactivates a customer, THE System SHALL set customer status to inactive and record deleted_at timestamp and deleted_by user
2. WHEN a customer is deactivated, THE System SHALL cancel all active policies linked to the customer
3. WHEN a customer is deactivated, THE System SHALL cancel all pending premium records linked to the customer
4. WHEN a customer is deactivated, THE System SHALL reject all pending commission records linked to the customer
5. WHEN a customer is deactivated, THE System SHALL mark all due renewals as lost
6. THE System SHALL prevent hard deletion of customer records
7. THE All_Entities_Page SHALL exclude inactive customers by default unless the user enables "Show Inactive" filter

### Requirement 22: Performance Requirements

**User Story:** As a user, I want the system to respond quickly, so that I can work efficiently.

#### Acceptance Criteria

1. THE All_Entities_Page SHALL load within 2 seconds with up to 10,000 customers
2. THE Client_360_View SHALL load within 3 seconds
3. WHEN a user performs a search, THE System SHALL return results within 1 second
4. WHEN a user applies filters, THE System SHALL update the display within 500 milliseconds
5. WHEN a user saves a customer, THE System SHALL complete the save operation within 2 seconds

### Requirement 23: Security and Access Control

**User Story:** As an Admin, I want to control access to customer data, so that I can ensure data security and privacy.

#### Acceptance Criteria

1. THE System SHALL enforce role-based access control with roles Admin, Manager, and Employee
2. THE System SHALL apply row-level security on customer data based on user role and assigned RM
3. WHEN a user attempts to access a customer they are not authorized to view, THE System SHALL deny access and log the attempt
4. THE System SHALL log all customer create, update, and delete operations in the audit log
5. THE System SHALL enforce document access control allowing only authorized users to download documents

### Requirement 24: Data Validation and Integrity

**User Story:** As an Admin or Manager, I want the system to validate data, so that I can maintain data quality.

#### Acceptance Criteria

1. THE System SHALL validate phone number format as 10 digits
2. THE System SHALL validate email format using standard email regex
3. THE System SHALL validate PAN format as 10 alphanumeric characters matching pattern [A-Z]{5}[0-9]{4}[A-Z]{1}
4. THE System SHALL validate GST format as 15 alphanumeric characters
5. THE System SHALL validate Aadhaar format as 12 digits
6. WHEN validation fails, THE System SHALL display an inline error message indicating the expected format
7. THE System SHALL enforce referential integrity between customers and policies, cases, claims, and tickets

### Requirement 25: Extensibility and Custom Fields

**User Story:** As an Admin, I want to add custom fields to customer types, so that I can capture additional information without schema changes.

#### Acceptance Criteria

1. THE System SHALL store customer type-specific data in Entity_Metadata JSONB field
2. THE System SHALL allow adding new fields to Entity_Metadata without database schema changes
3. THE System SHALL validate Entity_Metadata against customer type schema before saving
4. THE System SHALL support future customer types including Transporter, Manufacturer, and Trader
5. THE System SHALL allow administrators to define custom field configurations per customer type

---

## Notes

- All requirements follow EARS patterns (Ubiquitous, Event-driven, State-driven, Unwanted event, Optional feature, Complex)
- All requirements comply with INCOSE quality rules (clarity, testability, completeness, positive statements)
- Technical terms are defined in the Glossary
- Requirements are solution-free and focus on what the system should do, not how
- Implementation details will be specified in the Design document
- Property-based testing will be applied to correctness properties in the Tasks document
