# Requirements Document: Unified CRM Phase 3 - GMC & Fleet Integration

## Introduction

The Unified CRM Phase 3 feature builds upon Phase 1 (Customer Master + Client 360) and Phase 2 (Service Desk with SLA) to integrate GMC (Group Mediclaim) and Fleet insurance as specialized product-line engines within the main CRM for BP & AF Insurance Broker.

The system currently treats GMC and Fleet as disconnected systems without:
- GMC-specific corporate onboarding and intake flow
- GMC member management (bulk employee onboarding, dependent management)
- GMC e-card generation and distribution
- GMC member add/delete endorsement workflow
- GMC TPA integration and claims workflow
- Fleet-specific corporate onboarding and intake flow
- Fleet vehicle management (bulk vehicle onboarding, driver management)
- Fleet validity tracking UI (permits, fitness, PUC, RC, tax)
- Fleet claims workflow with surveyor appointment

This phase transforms the platform into a comprehensive insurance management system supporting:
- Corporate customer onboarding for GMC and Fleet product lines
- Bulk enrollment of employees and vehicles from policy schedules
- Member and vehicle lifecycle management with endorsements
- E-card generation for GMC members
- Validity tracking dashboard for Fleet vehicles
- Product-specific claims workflows (TPA for GMC, Surveyor for Fleet)
- Policy schedule management and bulk operations

## Glossary

- **System**: The BP & AF Insurance Broker CRM platform
- **GMC**: Group Mediclaim insurance product line
- **Fleet**: Fleet insurance product line
- **Corporate_Customer**: A business entity purchasing GMC or Fleet insurance
- **Policy_Schedule**: An Excel or CSV file containing member or vehicle enrollment data
- **GMC_Member**: An employee or dependent covered under a GMC policy
- **Employee**: A primary member of a GMC policy employed by the Corporate_Customer
- **Dependent**: A family member of an Employee covered under the GMC policy
- **E_Card**: A digital insurance card containing member details, TPA details, and policy details
- **E_Card_Template**: A configurable design for E_Card generation
- **TPA**: Third Party Administrator managing GMC claims processing
- **Fleet_Vehicle**: A vehicle covered under a Fleet policy
- **Driver**: A person authorized to operate a Fleet_Vehicle
- **Validity_Document**: A compliance document for Fleet_Vehicle including Permit, Fitness, PUC, RC, and Tax
- **Permit_Validity**: Authorization for vehicle operation (State or National)
- **Fitness_Validity**: Certificate of vehicle roadworthiness
- **PUC_Validity**: Pollution Under Control certificate
- **RC_Validity**: Registration Certificate validity
- **Tax_Validity**: Road tax payment validity (State or National)
- **Validity_Expiry_Alert**: A notification sent when a Validity_Document approaches expiration
- **Member_Endorsement**: A policy modification to add or remove GMC_Member
- **Vehicle_Endorsement**: A policy modification to add or remove Fleet_Vehicle
- **Surveyor**: An insurance assessor who evaluates Fleet claim damage
- **Bulk_Upload**: The process of importing multiple records from Excel or CSV files
- **IDV**: Insured Declared Value of a Fleet_Vehicle
- **Sum_Insured**: The maximum coverage amount for a GMC_Member or Fleet_Vehicle
- **Premium_Structure**: The pricing configuration for GMC or Fleet policies
- **Vehicle_Category**: The classification of Fleet_Vehicle (Two-wheeler, Four-wheeler, Commercial)
- **Member_Status**: The current state of a GMC_Member (Active, Inactive, Deleted)
- **Vehicle_Status**: The current state of a Fleet_Vehicle (Active, Inactive, Deleted)

## Requirements

### Requirement 1: GMC Corporate Customer Onboarding

**User Story:** As an Admin, I want to onboard a corporate customer for GMC insurance, so that I can manage group health insurance policies.

#### Acceptance Criteria

1. WHEN a user creates a Corporate_Customer with product type GMC, THE System SHALL store customer details including company name, industry, employee count, and contact information
2. WHEN a user creates a GMC policy for a Corporate_Customer, THE System SHALL store policy details including policy number, TPA, sum insured, premium structure, start date, and end date
3. THE System SHALL validate that policy start date is before policy end date
4. THE System SHALL validate that sum insured is a positive number
5. THE System SHALL allow selecting TPA from a predefined list of approved TPAs
6. WHEN a GMC policy is created, THE System SHALL generate a unique policy identifier
7. WHEN a GMC policy is created, THE System SHALL create an activity log entry recording the policy creation
8. THE System SHALL allow uploading Policy_Schedule in Excel or CSV format with columns for Employee ID, Name, DOB, Gender, Mobile, Email, Department, Designation, and Dependents

### Requirement 2: GMC Bulk Employee Enrollment

**User Story:** As an Admin, I want to bulk enroll employees from a policy schedule, so that I can efficiently onboard large groups.

#### Acceptance Criteria

1. WHEN a user uploads a Policy_Schedule file, THE System SHALL validate that the file format is Excel or CSV
2. THE System SHALL validate that the file size is less than 10 MB
3. THE System SHALL validate that required columns Employee ID, Name, DOB, and Gender are present
4. WHEN the Policy_Schedule is processed, THE System SHALL create a GMC_Member record for each valid employee row
5. WHEN the Policy_Schedule is processed, THE System SHALL create a GMC_Member record for each valid dependent row linked to the employee
6. THE System SHALL validate that Employee ID is unique within the Corporate_Customer
7. THE System SHALL validate that DOB is a valid date in the past
8. THE System SHALL validate that Gender is one of Male, Female, or Other
9. THE System SHALL validate that Mobile is a valid 10-digit number
10. THE System SHALL validate that Email is a valid email address format
11. WHEN a row fails validation, THE System SHALL record the error and continue processing remaining rows
12. WHEN bulk enrollment completes, THE System SHALL display a summary showing successful imports, failed imports, and error details
13. THE System SHALL complete bulk enrollment of 1000 records within 30 seconds

### Requirement 3: GMC Member Management

**User Story:** As an Admin or Manager, I want to manage GMC members, so that I can add, update, and remove employees and dependents.

#### Acceptance Criteria

1. THE System SHALL provide a GMC member list view displaying Employee ID, Name, Member Type, Status, Department, Mobile, and Policy
2. WHEN a user adds an Employee manually, THE System SHALL validate that Employee ID is unique within the Corporate_Customer
3. WHEN a user adds a Dependent manually, THE System SHALL validate that the Dependent is linked to an active Employee
4. THE System SHALL allow updating member details including Name, Mobile, Email, and Address
5. WHEN a user deactivates a GMC_Member, THE System SHALL set Member_Status to Inactive and record the deactivation date
6. WHEN a user deletes a GMC_Member, THE System SHALL set Member_Status to Deleted and create a Member_Endorsement record
7. THE System SHALL allow searching members by Name, Employee ID, or Mobile
8. THE System SHALL allow filtering members by Member_Status, Department, or Designation
9. THE System SHALL load the member list within 2 seconds with 10,000 or more members
10. WHEN a user views member details, THE System SHALL display policy information, claims history, and E_Card generation history

### Requirement 4: GMC E-Card Template Configuration

**User Story:** As an Admin, I want to configure an e-card template, so that I can generate branded insurance cards for members.

#### Acceptance Criteria

1. THE System SHALL provide an E_Card_Template configuration interface accessible to users with role admin
2. THE System SHALL allow uploading a company logo image in PNG or JPG format
3. THE System SHALL validate that logo file size is less than 2 MB
4. THE System SHALL allow configuring template fields including Company Name, TPA Name, TPA Contact, Policy Number, and Emergency Contact
5. THE System SHALL allow previewing the E_Card_Template with sample data
6. WHEN an E_Card_Template is saved, THE System SHALL validate that all required fields are configured
7. THE System SHALL store the E_Card_Template configuration linked to the Corporate_Customer

### Requirement 5: GMC E-Card Generation

**User Story:** As an Admin or Manager, I want to generate e-cards for GMC members, so that members can access their insurance details.

#### Acceptance Criteria

1. WHEN a user requests E_Card generation for a GMC_Member, THE System SHALL generate a PDF document using the configured E_Card_Template
2. THE E_Card SHALL include member details including Name, Employee ID, DOB, Gender, and Member Type
3. THE E_Card SHALL include TPA details including TPA Name, TPA Contact, and TPA Email
4. THE E_Card SHALL include policy details including Policy Number, Sum Insured, Start Date, and End Date
5. THE E_Card SHALL include the company logo from the E_Card_Template
6. THE System SHALL generate the E_Card PDF within 5 seconds
7. THE System SHALL allow downloading the E_Card PDF
8. THE System SHALL allow emailing the E_Card to the member email address
9. WHEN an E_Card is generated, THE System SHALL record the generation timestamp and generated by user
10. THE System SHALL allow regenerating E_Card for a member
11. THE System SHALL allow bulk E_Card generation for all active members of a policy
12. WHEN bulk E_Card generation is requested, THE System SHALL generate E_Cards for all active members within 60 seconds for 100 members

### Requirement 6: GMC Member Endorsement Workflow

**User Story:** As an Admin, I want to process member add/delete endorsements, so that I can modify policy coverage.

#### Acceptance Criteria

1. WHEN a user adds a new GMC_Member to an active policy, THE System SHALL create a Member_Endorsement record with type Addition
2. WHEN a user deletes a GMC_Member from an active policy, THE System SHALL create a Member_Endorsement record with type Deletion
3. THE Member_Endorsement SHALL include endorsement number, endorsement date, member details, and reason
4. THE System SHALL generate a unique endorsement number in format END-GMC-XXXXX
5. WHEN a Member_Endorsement is created, THE System SHALL update the policy member count
6. WHEN a Member_Endorsement is created, THE System SHALL create an activity log entry
7. THE System SHALL allow viewing endorsement history for a policy
8. THE System SHALL allow exporting endorsement report as PDF

### Requirement 7: GMC Claims Workflow

**User Story:** As an Admin or Manager, I want to manage GMC claims, so that I can track claim status and settlement.

#### Acceptance Criteria

1. WHEN a user registers a claim for a GMC_Member, THE System SHALL validate that the member has an active policy
2. THE System SHALL store claim details including claim number, claim date, member, TPA, claim amount, and claim type
3. THE System SHALL generate a unique claim number in format CLM-GMC-XXXXX
4. THE System SHALL allow uploading claim documents including medical bills, prescriptions, and discharge summaries
5. THE System SHALL validate that document file size is less than 10 MB per file
6. THE System SHALL track claim status including Registered, Submitted to TPA, Under Review, Approved, Settled, and Rejected
7. WHEN claim status is updated to Settled, THE System SHALL record the settlement amount and settlement date
8. THE System SHALL allow viewing claim history by GMC_Member
9. THE System SHALL allow viewing claim analytics by TPA including total claims, approved claims, rejected claims, and average settlement time
10. WHEN a claim is registered, THE System SHALL send a notification to the assigned RM

### Requirement 8: Fleet Corporate Customer Onboarding

**User Story:** As an Admin, I want to onboard a corporate customer for Fleet insurance, so that I can manage fleet insurance policies.

#### Acceptance Criteria

1. WHEN a user creates a Corporate_Customer with product type Fleet, THE System SHALL store customer details including company name, industry, fleet size, and contact information
2. WHEN a user creates a Fleet policy for a Corporate_Customer, THE System SHALL store policy details including policy number, vehicle categories, sum insured, premium structure, start date, and end date
3. THE System SHALL validate that policy start date is before policy end date
4. THE System SHALL validate that sum insured is a positive number
5. THE System SHALL allow selecting Vehicle_Category from Two-wheeler, Four-wheeler, and Commercial
6. WHEN a Fleet policy is created, THE System SHALL generate a unique policy identifier
7. WHEN a Fleet policy is created, THE System SHALL create an activity log entry recording the policy creation
8. THE System SHALL allow uploading Policy_Schedule in Excel or CSV format with columns for Registration Number, Make, Model, Variant, Fuel Type, Chassis Number, Engine Number, MFG Year, Seating Capacity, GVW, and IDV

### Requirement 9: Fleet Bulk Vehicle Enrollment

**User Story:** As an Admin, I want to bulk enroll vehicles from a policy schedule, so that I can efficiently onboard large fleets.

#### Acceptance Criteria

1. WHEN a user uploads a Policy_Schedule file, THE System SHALL validate that the file format is Excel or CSV
2. THE System SHALL validate that the file size is less than 10 MB
3. THE System SHALL validate that required columns Registration Number, Make, Model, and MFG Year are present
4. WHEN the Policy_Schedule is processed, THE System SHALL create a Fleet_Vehicle record for each valid vehicle row
5. THE System SHALL validate that Registration Number is unique across all Fleet_Vehicle records
6. THE System SHALL validate that MFG Year is a valid year between 1900 and current year
7. THE System SHALL validate that IDV is a positive number
8. THE System SHALL validate that Seating Capacity is a positive integer
9. THE System SHALL validate that GVW is a positive number
10. WHEN a row fails validation, THE System SHALL record the error and continue processing remaining rows
11. WHEN bulk enrollment completes, THE System SHALL display a summary showing successful imports, failed imports, and error details
12. THE System SHALL complete bulk enrollment of 1000 records within 30 seconds

### Requirement 10: Fleet Vehicle Management

**User Story:** As an Admin or Manager, I want to manage Fleet vehicles, so that I can add, update, and remove vehicles.

#### Acceptance Criteria

1. THE System SHALL provide a Fleet vehicle list view displaying Registration Number, Make, Model, Vehicle_Status, IDV, and Policy
2. WHEN a user adds a Fleet_Vehicle manually, THE System SHALL validate that Registration Number is unique
3. THE System SHALL allow updating vehicle details including Make, Model, Variant, IDV, and Driver assignment
4. WHEN a user deactivates a Fleet_Vehicle, THE System SHALL set Vehicle_Status to Inactive and record the deactivation date
5. WHEN a user deletes a Fleet_Vehicle, THE System SHALL set Vehicle_Status to Deleted and create a Vehicle_Endorsement record
6. THE System SHALL allow searching vehicles by Registration Number, Make, or Model
7. THE System SHALL allow filtering vehicles by Vehicle_Status, Vehicle_Category, or Fuel Type
8. THE System SHALL load the vehicle list within 2 seconds with 5,000 or more vehicles
9. WHEN a user views vehicle details, THE System SHALL display policy information, claims history, validity document status, and driver information

### Requirement 11: Fleet Driver Management

**User Story:** As an Admin or Manager, I want to manage drivers, so that I can assign drivers to vehicles.

#### Acceptance Criteria

1. THE System SHALL provide a driver management interface for creating and updating Driver records
2. THE System SHALL store driver details including Name, License Number, License Expiry, Mobile, and Address
3. THE System SHALL validate that License Number is unique
4. THE System SHALL validate that License Expiry is a future date
5. THE System SHALL allow assigning a Driver as the primary driver for a Fleet_Vehicle
6. THE System SHALL validate that a Fleet_Vehicle has at most one primary driver
7. WHEN License Expiry is within 30 days, THE System SHALL send a Validity_Expiry_Alert to the assigned RM
8. THE System SHALL allow viewing all vehicles assigned to a Driver

### Requirement 12: Fleet Validity Tracking

**User Story:** As an Admin or Manager, I want to track vehicle validity documents, so that I can ensure compliance and send renewal reminders.

#### Acceptance Criteria

1. THE System SHALL store Permit_Validity with type State or National, issue date, and expiry date for each Fleet_Vehicle
2. THE System SHALL store Fitness_Validity with issue date and expiry date for each Fleet_Vehicle
3. THE System SHALL store PUC_Validity with issue date and expiry date for each Fleet_Vehicle
4. THE System SHALL store RC_Validity with issue date and expiry date for each Fleet_Vehicle
5. THE System SHALL store Tax_Validity with type State or National, issue date, and expiry date for each Fleet_Vehicle
6. THE System SHALL validate that expiry date is after issue date for all Validity_Document types
7. THE System SHALL allow updating validity dates when documents are renewed
8. WHEN a Validity_Document expiry date is within 30 days, THE System SHALL send a Validity_Expiry_Alert to the assigned RM
9. WHEN a Validity_Document expiry date is within 15 days, THE System SHALL send a Validity_Expiry_Alert to the assigned RM
10. WHEN a Validity_Document expiry date is within 7 days, THE System SHALL send a Validity_Expiry_Alert to the assigned RM
11. THE System SHALL check for expiring Validity_Document records every 24 hours
12. THE System SHALL provide a validity dashboard displaying all Fleet_Vehicle records with expiring documents grouped by expiry timeframe

### Requirement 13: Fleet Validity Dashboard

**User Story:** As an Admin or Manager, I want to view a validity dashboard, so that I can monitor expiring documents and take action.

#### Acceptance Criteria

1. THE System SHALL provide a validity dashboard displaying Fleet_Vehicle records with expiring Validity_Document records
2. THE validity dashboard SHALL group vehicles by expiry timeframe including Expired, Expiring in 7 days, Expiring in 15 days, and Expiring in 30 days
3. THE validity dashboard SHALL display Registration Number, Validity_Document type, Expiry Date, and Days Remaining for each vehicle
4. THE validity dashboard SHALL allow filtering by Validity_Document type
5. THE validity dashboard SHALL allow filtering by Vehicle_Category
6. THE validity dashboard SHALL allow sorting by Expiry Date
7. THE validity dashboard SHALL provide a quick action to update validity dates
8. THE validity dashboard SHALL load within 2 seconds with 5,000 or more vehicles

### Requirement 14: Fleet Vehicle Endorsement Workflow

**User Story:** As an Admin, I want to process vehicle add/delete endorsements, so that I can modify policy coverage.

#### Acceptance Criteria

1. WHEN a user adds a new Fleet_Vehicle to an active policy, THE System SHALL create a Vehicle_Endorsement record with type Addition
2. WHEN a user deletes a Fleet_Vehicle from an active policy, THE System SHALL create a Vehicle_Endorsement record with type Deletion
3. THE Vehicle_Endorsement SHALL include endorsement number, endorsement date, vehicle details, and reason
4. THE System SHALL generate a unique endorsement number in format END-FLT-XXXXX
5. WHEN a Vehicle_Endorsement is created, THE System SHALL update the policy vehicle count
6. WHEN a Vehicle_Endorsement is created, THE System SHALL create an activity log entry
7. THE System SHALL allow viewing endorsement history for a policy
8. THE System SHALL allow exporting endorsement report as PDF

### Requirement 15: Fleet Claims Workflow

**User Story:** As an Admin or Manager, I want to manage Fleet claims, so that I can track claim status and settlement.

#### Acceptance Criteria

1. WHEN a user registers a claim for a Fleet_Vehicle, THE System SHALL validate that the vehicle has an active policy
2. THE System SHALL store claim details including claim number, claim date, vehicle, claim amount, claim type, and accident details
3. THE System SHALL generate a unique claim number in format CLM-FLT-XXXXX
4. THE System SHALL allow appointing a Surveyor with surveyor name, contact, and appointment date
5. THE System SHALL allow uploading claim documents including accident photos, police report, and repair estimates
6. THE System SHALL validate that document file size is less than 10 MB per file
7. THE System SHALL track claim status including Registered, Surveyor Appointed, Assessment Done, Approved, Settled, and Rejected
8. WHEN claim status is updated to Settled, THE System SHALL record the settlement amount and settlement date
9. THE System SHALL allow viewing claim history by Fleet_Vehicle
10. THE System SHALL allow viewing claim analytics by Vehicle_Category including total claims, approved claims, rejected claims, and average settlement time
11. WHEN a claim is registered, THE System SHALL send a notification to the assigned RM

### Requirement 16: GMC Member Uniqueness

**User Story:** As a System Administrator, I want to ensure GMC member uniqueness, so that duplicate members are prevented.

#### Acceptance Criteria

1. FOR ALL GMC_Member records within a Corporate_Customer, THE System SHALL enforce that no two members have the same Employee ID
2. WHEN a user attempts to create a GMC_Member with a duplicate Employee ID, THE System SHALL reject the operation and display an error message
3. THE System SHALL perform uniqueness validation during manual member creation
4. THE System SHALL perform uniqueness validation during Bulk_Upload processing
5. WHEN a duplicate is detected during Bulk_Upload, THE System SHALL skip the duplicate row and record the error

### Requirement 17: Fleet Vehicle Uniqueness

**User Story:** As a System Administrator, I want to ensure Fleet vehicle uniqueness, so that duplicate vehicles are prevented.

#### Acceptance Criteria

1. FOR ALL Fleet_Vehicle records, THE System SHALL enforce that no two vehicles have the same Registration Number
2. WHEN a user attempts to create a Fleet_Vehicle with a duplicate Registration Number, THE System SHALL reject the operation and display an error message
3. THE System SHALL perform uniqueness validation during manual vehicle creation
4. THE System SHALL perform uniqueness validation during Bulk_Upload processing
5. WHEN a duplicate is detected during Bulk_Upload, THE System SHALL skip the duplicate row and record the error

### Requirement 18: GMC Dependent Linkage

**User Story:** As a System Administrator, I want to ensure dependent linkage integrity, so that orphaned dependents are prevented.

#### Acceptance Criteria

1. FOR ALL Dependent records, THE System SHALL enforce that the Dependent is linked to an active Employee
2. WHEN a user attempts to create a Dependent without linking to an Employee, THE System SHALL reject the operation and display an error message
3. WHEN an Employee is deactivated, THE System SHALL automatically deactivate all linked Dependent records
4. WHEN an Employee is deleted, THE System SHALL automatically delete all linked Dependent records

### Requirement 19: Fleet Driver Assignment

**User Story:** As a System Administrator, I want to ensure driver assignment integrity, so that vehicles have at most one primary driver.

#### Acceptance Criteria

1. FOR ALL Fleet_Vehicle records, THE System SHALL enforce that a vehicle has at most one primary driver
2. WHEN a user attempts to assign a second primary driver to a Fleet_Vehicle, THE System SHALL reject the operation and display an error message
3. THE System SHALL allow reassigning the primary driver from one Driver to another Driver
4. THE System SHALL allow removing the primary driver assignment

### Requirement 20: Bulk Upload Validation

**User Story:** As an Admin, I want clear error messages for bulk upload failures, so that I can correct data and retry.

#### Acceptance Criteria

1. FOR ALL Bulk_Upload operations, THE System SHALL validate each row independently
2. WHEN a row fails validation, THE System SHALL record the row number, field name, and error message
3. WHEN Bulk_Upload completes, THE System SHALL display a summary report including total rows, successful rows, failed rows, and error details
4. THE System SHALL allow downloading the error report as CSV
5. THE System SHALL allow retrying Bulk_Upload after correcting errors

### Requirement 21: Performance Requirements

**User Story:** As a user, I want the system to respond quickly, so that I can work efficiently with large datasets.

#### Acceptance Criteria

1. THE System SHALL load the GMC member list within 2 seconds with 10,000 or more members
2. THE System SHALL load the Fleet vehicle list within 2 seconds with 5,000 or more vehicles
3. THE System SHALL complete Bulk_Upload processing within 30 seconds for 1,000 records
4. THE System SHALL generate an E_Card within 5 seconds
5. THE System SHALL return search results within 1 second
6. THE System SHALL load the validity dashboard within 2 seconds with 5,000 or more vehicles

### Requirement 22: Security and Access Control

**User Story:** As an Admin, I want to control access to GMC and Fleet data, so that I can ensure data security and privacy.

#### Acceptance Criteria

1. THE System SHALL enforce role-based access control with roles admin, manager, and employee
2. THE System SHALL apply row-level security on GMC_Member records based on user role and Corporate_Customer assignment
3. THE System SHALL apply row-level security on Fleet_Vehicle records based on user role and Corporate_Customer assignment
4. WHEN a user attempts to access a record they are not authorized to view, THE System SHALL deny access and log the attempt
5. THE System SHALL log all GMC_Member and Fleet_Vehicle create, update, and delete operations in the audit log
6. THE System SHALL enforce document access control allowing only authorized users to download documents

### Requirement 23: Data Integrity

**User Story:** As a System Administrator, I want to maintain data integrity, so that referential relationships are preserved.

#### Acceptance Criteria

1. WHEN a Corporate_Customer is deactivated, THE System SHALL automatically deactivate all linked GMC_Member records
2. WHEN a Corporate_Customer is deactivated, THE System SHALL automatically deactivate all linked Fleet_Vehicle records
3. WHEN a GMC policy is deactivated, THE System SHALL automatically deactivate all linked GMC_Member records
4. WHEN a Fleet policy is deactivated, THE System SHALL automatically deactivate all linked Fleet_Vehicle records
5. THE System SHALL prevent deleting a Corporate_Customer with active GMC_Member or Fleet_Vehicle records
6. THE System SHALL prevent deleting a policy with active GMC_Member or Fleet_Vehicle records

### Requirement 24: Notification System

**User Story:** As an Admin or Manager, I want to receive notifications for important events, so that I can take timely action.

#### Acceptance Criteria

1. WHEN a Validity_Document expiry date is within 30 days, THE System SHALL send a notification to the assigned RM
2. WHEN a Validity_Document expiry date is within 15 days, THE System SHALL send a notification to the assigned RM
3. WHEN a Validity_Document expiry date is within 7 days, THE System SHALL send a notification to the assigned RM
4. WHEN a Driver License Expiry is within 30 days, THE System SHALL send a notification to the assigned RM
5. WHEN a GMC claim is registered, THE System SHALL send a notification to the assigned RM
6. WHEN a Fleet claim is registered, THE System SHALL send a notification to the assigned RM
7. WHEN Bulk_Upload completes, THE System SHALL send a notification to the user who initiated the upload

### Requirement 25: Audit Logging

**User Story:** As an Admin, I want comprehensive audit logging, so that I can track all changes to GMC and Fleet data.

#### Acceptance Criteria

1. THE System SHALL create an audit log entry for GMC_Member creation
2. THE System SHALL create an audit log entry for GMC_Member updates
3. THE System SHALL create an audit log entry for GMC_Member deletion
4. THE System SHALL create an audit log entry for Fleet_Vehicle creation
5. THE System SHALL create an audit log entry for Fleet_Vehicle updates
6. THE System SHALL create an audit log entry for Fleet_Vehicle deletion
7. THE System SHALL create an audit log entry for Member_Endorsement creation
8. THE System SHALL create an audit log entry for Vehicle_Endorsement creation
9. THE System SHALL create an audit log entry for E_Card generation
10. THE audit log SHALL include timestamp, user, action type, record type, record ID, and changes made

