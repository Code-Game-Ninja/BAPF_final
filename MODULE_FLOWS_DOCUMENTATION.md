# BP & AF Insurance CRM - Module Flows Documentation

> Complete workflow diagrams and data flows for all system modules  
> **Version**: 1.0.0 | **Last Updated**: May 2026

---

## Table of Contents

1. [Core Business Flows](#1-core-business-flows)
2. [Module-Specific Flows](#2-module-specific-flows)
3. [Data Flow Diagrams](#3-data-flow-diagrams)
4. [Integration Points](#4-integration-points)
5. [State Machines](#5-state-machines)

---

## 1. CORE BUSINESS FLOWS

### 1.1 Complete Insurance Lifecycle (The "Happy Path")

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INSURANCE LIFECYCLE FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   INTAKE     │────▶│  SALES LEAD  │────▶│    QUOTE     │────▶│   PROPOSAL   │
│  (Raw Data)  │     │ (Qualified)  │     │ (Comparison) │     │ (Selected)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
       │                    │                    │                      │
       │                    │                    │                      │
       ▼                    ▼                    ▼                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  Database Tables: intake → sales_leads → quotes → proposals → policies         │
│  Status Flow: new → contacted → quoted → proposed → converted                │
└───────────────────────────────────────────────────────────────────────────────┘

                                     │
                                     ▼
                              ┌──────────────┐
                              │    POLICY    │
                              │   (Issued)   │
                              └──────┬───────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
              ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
              │   RENEWAL    │ │    CLAIM     │ │ ENDORSEMENT  │
              │  (30d before)│ │  (If needed) │ │  (Changes)   │
              └──────┬───────┘ └──────────────┘ └──────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  ┌──────────────┐      ┌──────────────┐
  │   RENEWED    │      │    LOST     │
  │ (Back to     │      │  (Archived) │
  │   Policy)    │      │             │
  └──────────────┘      └──────────────┘
```

### 1.2 Service Desk Support Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE DESK TICKET FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   TICKET    │───▶│ CATEGORIZED │───▶│  SLA CLOCK  │───▶│ IN PROGRESS │
│   CREATED   │    │ (7 types)   │    │   STARTS    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                  │
                                    ┌─────────────────────────────┼─────────────┐
                                    │                             │             │
                                    ▼                             ▼             ▼
                             ┌─────────────┐              ┌─────────────┐  ┌─────────────┐
                             │  ESCALATED  │              │  RESOLVED   │  │   CLOSED    │
                             │(SLA Breach) │              │             │  │             │
                             └──────┬──────┘              └──────┬──────┘  └─────────────┘
                                    │                            │
                                    ▼                            │
                             ┌─────────────┐                     │
                             │  MANAGER    │─────────────────────┘
                             │ NOTIFIED    │
                             └─────────────┘

SLA Categories & Deadlines:
├── ecard_request: 4 hours
├── member_endorsement: 8 hours
├── name_correction: 24 hours
├── address_correction: 24 hours
├── invoice_dispute: 48 hours
├── claim_assistance: 2 hours
└── general_query: 24 hours
```

### 1.3 Financial & Commission Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FINANCIAL FLOW (Premium → Commission)                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    POLICY    │────▶│   PREMIUM    │────▶│   INVOICE    │────▶│   PAYMENT    │
│   CREATED    │     │  (Auto-gen)  │     │   ISSUED     │     │  RECEIVED    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
                                                                      ▼
                                                           ┌───────────────────┐
                                                           │  LEDGER ENTRY     │
                                                           │  (Debit/Credit)   │
                                                           └─────────┬─────────┘
                                                                     │
                                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           COMMISSION CALCULATION                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ COMMISSION   │────▶│   EXPECTED   │────▶│    ACTUAL    │────▶│RECONCILIATION│
│   RULES      │     │  COMMISSION  │     │   PAYOUT     │     │   MATCHING   │
│ (Policy Type,│     │ (Auto-calc) │     │(From Insurer)│     │              │
│  Insurer,    │     │              │     │              │     │              │
│  Premium)    │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                     │
                                                                     ▼
                                                           ┌───────────────────┐
                                                           │  PAYOUT STATUS    │
                                                           ├── pending         │
                                                           ├── approved        │
                                                           ├── paid            │
                                                           └── rejected        │
                                                           └───────────────────┘
```

---

## 2. MODULE-SPECIFIC FLOWS

### 2.1 Customer Module Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER MANAGEMENT FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

NEW CUSTOMER ENTRY:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   SOURCE    │───▶│   MANUAL    │───▶│    KYC      │───▶│   PORTAL    │
│   INTAKE    │    │    ENTRY    │    │   VERIFY    │    │   CREATE    │
│  (Extract)  │    │   (Form)    │    │  (Upload)   │    │  (Optional) │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       └──────────────────┴──────────────────┴──────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │  CUSTOMER RECORD    │
                    │  UID: C-XXXX       │
                    │  Type: Individual/│
                    │       Corporate    │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌────────────┐  ┌────────────┐  ┌────────────┐
       │   FAMILY   │  │   POLICY   │  │    GMC     │
       │  MEMBERS   │  │   CREATE   │  │  (Group)   │
       └────────────┘  └────────────┘  └────────────┘

CUSTOMER TYPE DETECTION:
┌─────────────────────────────────────────────────────────────────┐
│ Individual                                                      │
│ ├── entity_meta.individual: {dob, gender, occupation, pan...} │
│ └── KYC: Aadhaar, PAN, Address Proof                            │
├─────────────────────────────────────────────────────────────────┤
│ Corporate                                                       │
│ ├── entity_meta.corporate: {gst, pan, industry, revenue...}    │
│ └── Members: [{name, designation, email, mobile}...]           │
│ └── KYC: GST, Company Registration, Board Resolution           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Policy Module - Motor Insurance Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      MOTOR POLICY CREATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CUSTOMER    │────▶│  VEHICLE     │────▶│   COVERAGE   │────▶│   PREMIUM    │
│  SELECTED    │     │   DETAILS    │     │   OPTIONS    │     │  CALCULATION │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                       │
┌──────────────────────────────────────────────────────────────────────┴───────────┐
│ MOTOR_METADATA (JSONB)                                                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Identification:                                                                   │
│ ├── registration_number: "MH01AB1234"                                            │
│ ├── make: "Maruti"                                                                │
│ ├── model: "Swift"                                                                │
│ ├── variant: "VXI"                                                                │
│ ├── fuel_type: "petrol"                                                           │
│ ├── mfg_month_year: "01/2023"                                                    │
│ └── chassis_number, engine_number...                                              │
│                                                                                   │
│ Financials:                                                                       │
│ ├── idv_vehicle: 500000                                                          │
│ ├── idv_accessories: 0                                                           │
│ ├── ncb_percent: 20                                                              │
│ ├── net_premium: 8500                                                            │
│ ├── tp_premium: 2000                                                            │
│ ├── gst_amount: 1890                                                            │
│ └── final_premium: 12390                                                         │
│                                                                                   │
│ Add-ons (Boolean):                                                              │
│ ├── zero_dep: true                                                               │
│ ├── rti (Return to Invoice): false                                              │
│ ├── rsa (Roadside Assistance): true                                             │
│ ├── engine_protector: true                                                       │
│ └── ... 10+ more options                                                         │
└──────────────────────────────────────────────────────────────────────────────────┘

PREMIUM CALCULATION FLOW:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│     IDV     │───▶│    NCB      │───▶│   ADD-ONS   │───▶│    GST      │
│   (Vehicle  │    │  (No Claim  │    │  (Selected  │    │   (18%)     │
│   Value)    │    │   Bonus)    │    │   Covers)   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                       ┌───────────────────┐
                                                       │   FINAL PREMIUM   │
                                                       │  = OD + TP + GST  │
                                                       └───────────────────┘
```

### 2.3 Sales Lead Flow (CRM Pipeline)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SALES LEAD PIPELINE (Kanban)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│   NEW   │───▶│CONTACTED│───▶│FOLLOW_UP│───▶│INTERESTED│───▶│MEETING_ │
│         │    │         │    │         │    │          │    │  DONE   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                                   │
                                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   ┌─────────────┐         ┌───────────┐          ┌─────────────────────────┐   │
│   │PROPOSAL_SENT│────────▶│NEGOTIATION│────────▶│       CONVERTED         │   │
│   └─────────────┘         └─────┬─────┘          │   (Creates Customer    │   │
│                                 │                 │    + Policy)          │   │
│                                 ▼                 └─────────────────────────┘   │
│                          ┌───────────┐                                         │
│                          │    LOST   │                                         │
│                          │  (Reason: │                                         │
│                          │  price/   │                                         │
│                          │  no_response)                                        │
│                          └───────────┘                                         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

LEAD REMINDER SYSTEM:
┌─────────────────────────────────────────────────────────────────┐
│ Lead Created ──▶ Check follow_up_date                             │
│                      │                                          │
│                      ▼                                          │
│              ┌───────────────┐                                   │
│              │  Create       │                                   │
│              │  Reminder     │                                   │
│              │  (lead_reminders table)                          │
│              └───────┬───────┘                                   │
│                      │                                          │
│                      ▼                                          │
│              ┌───────────────┐                                   │
│              │  Daily Check  │                                   │
│              │  (Cron Job)   │                                   │
│              └───────┬───────┘                                   │
│                      │                                          │
│              ┌───────┴───────┐                                  │
│              │               │                                   │
│              ▼               ▼                                   │
│       ┌──────────┐    ┌──────────┐                             │
│       │  NOTIFY  │    │   SKIP   │                             │
│       │  USER    │    │  (Done)  │                             │
│       └──────────┘    └──────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Intake Flow (7-Step Wizard)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UNIFIED INTAKE DESK (7-STEP WIZARD)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: DOCUMENT UPLOAD                                                           │
│ ├── Drag & drop PDF or Image                                                     │
│ ├── File validation (type, size 10MB)                                           │
│ └── Upload to temp storage                                                       │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 2: AI EXTRACTION (Optional)                                                │
│ ├── Google Gemini AI analysis                                                    │
│ ├── Regex fallback for missing fields                                            │
│ └── Structured data output:                                                      │
│     ├── policyDetails: {policyNumber, insurer, premium, dates...}               │
│     ├── customerDetails: {name, phone, email, address...}                       │
│     └── motorDetails: {regNumber, make, model, chassis...}                      │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 3: CUSTOMER SELECTION                                                       │
│ ├── Option A: Select existing customer                                           │
│ ├── Option B: Create new customer                                                │
│ └── Auto-populate from extraction data                                          │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 4: POLICY DETAILS                                                           │
│ ├── Policy type selection (Motor/Health/Life/Fire...)                           │
│ ├── Policy number (auto-format validation)                                      │
│ ├── Dates (start_date, end_date)                                                │
│ └── Product-specific fields (dynamic form)                                      │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 5: FINANCIAL DETAILS                                                        │
│ ├── Premium amount                                                               │
│ ├── Sum insured                                                                  │
│ ├── Payment frequency                                                           │
│ └── Payment method                                                              │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 6: ASSIGNMENT                                                               │
│ ├── Assign to employee                                                           │
│ ├── Branch selection                                                             │
│ └── Tags/Campaign linking                                                        │
│         │                                                                        │
│         ▼                                                                        │
│ STEP 7: REVIEW & SUBMIT                                                          │
│ ├── Preview all data                                                             │
│ ├── Edit any field                                                               │
│ ├── Submit to create policy                                                      │
│ └── Redirect to policy detail                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

INTAKE → POLICY DATA FLOW:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │  INTAKE │───▶│ EXTRACT │───▶│  PARSE  │───▶│ POLICY  │    │
│  │  FORM   │    │   PDF   │    │  DATA   │    │  CREATE │    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    │
│                                                      │         │
│                                                      ▼         │
│                                               ┌─────────┐     │
│                                               │ AUDIT   │     │
│                                               │  LOG    │     │
│                                               └─────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Attendance Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ATTENDANCE TRACKING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

DAILY ATTENDANCE CYCLE:

MORNING:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   OPEN      │───▶│  GPS CHECK  │───▶│  CHECK-IN   │───▶│   STATUS    │
│   APP       │    │  LOCATION   │    │   RECORD    │    │  DETECTED   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                  │
                                                    ┌─────────────┴─────────────┐
                                                    │                           │
                                                    ▼                           ▼
                                             ┌──────────┐              ┌──────────┐
                                             │ PRESENT  │              │   LATE   │
                                             │ (>9:00)  │              │ (>9:30)  │
                                             └──────────┘              └──────────┘

EVENING:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CHECKOUT  │───▶│ CALCULATE   │───▶│   STATUS    │───▶│   DAILY     │
│   REQUEST   │    │   HOURS     │    │   UPDATE    │    │   TOTAL     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                                                        │
      │ (Early)                                                │
      ▼                                                        ▼
┌─────────────┐                                      ┌───────────────────┐
│ EARLY       │                                      │   ATTENDANCE      │
│ CHECKOUT    │                                      │     RECORD        │
│ REQUEST     │                                      ├───────────────────┤
├─────────────┤                                      │ date: 2026-05-07  │
│ Reason:     │                                      │ check_in: 09:00  │
│ "Emergency" │                                      │ check_out: 18:30 │
│             │                                      │ status: present  │
│ Approval:   │                                      │ worked_hours: 9.5│
│ ━ PENDING   │                                      └───────────────────┘
│ ✓ APPROVED  │
│ ✗ REJECTED  │
└─────────────┘

AUTO-ABSENT JOB (Daily at 10:00 AM):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   CHECK     │───▶│  NO CHECK-  │───▶│   MARK      │        │
│  │  ATTENDANCE │    │    IN?      │    │   ABSENT    │        │
│  │   RECORDS   │    │             │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                          │                                      │
│                          │ (Holiday?)                           │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │    SKIP     │                               │
│                   │  (Holiday)  │                               │
│                   └─────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 Renewal Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RENEWAL MANAGEMENT FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

AUTOMATIC RENEWAL DETECTION (Daily Cron Job):

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  CHECK ALL   │───▶│  EXPIRY IN   │───▶│   CREATE     │───▶│   NOTIFY     │ │
│  │   POLICIES   │    │  30-60 DAYS? │    │   RENEWAL    │    │   USER       │ │
│  │              │    │              │    │   RECORD     │    │              │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

RENEWAL STATUS WORKFLOW:

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   DUE    │───▶│CONTACTED │───▶│  QUOTE   │───▶│ RENEWED  │    │          │
│(Detected)│    │  (Call)  │    │  (Sent)  │    │          │    │          │
└──────────┘    └──────────┘    └────┬─────┘    └────┬─────┘    │          │
                                     │               │          │          │
                                     │               │          │          │
                                     ▼               │          │          │
                               ┌──────────┐          │          │          │
                               │  LOST    │◄─────────┴──────────┴──────────┘
                               │(No resp) │          (Any stage)
                               └──────────┘

RENEWED POLICY FLOW:
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ RENEWAL  │───▶│  UPDATE  │───▶│  CREATE  │───▶│  CLOSE   │
│ ACCEPTED │    │  DATES   │    │  POLICY  │    │ RENEWAL  │
└──────────┘    │(Extend 1yr)│   │  (New #) │    │ (Status) │
                └──────────┘    └──────────┘    └──────────┘
```

### 2.7 Claims Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CLAIMS PROCESSING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

CLAIM REGISTRATION:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   POLICY    │───▶│   INCIDENT  │───▶│   CLAIM     │───▶│   CLAIM     │
│  SELECTED   │    │   REPORTED  │    │   NUMBER    │    │   STATUS:   │
└─────────────┘    └─────────────┘    │  (Auto-gen) │    │  REGISTERED │
                                       └─────────────┘    └─────────────┘

CLAIM STATUS PIPELINE (10 Stages):

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  REGISTERED │───▶│   DOCS      │───▶│   UNDER     │───▶│  SURVEYOR   │
│             │    │  PENDING    │    │   REVIEW    │    │  APPOINTED  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                              │
                                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CLOSED    │◄───│   SETTLED   │◄───│   APPROVED  │◄───│  ASSESSMENT │
│             │    │   (Paid)    │    │             │    │    DONE     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              │ (If rejected)
                                              ▼
                                       ┌─────────────┐
                                       │   REJECTED  │
                                       │  (Reason: ) │
                                       └─────────────┘

CLAIM DOCUMENTS:
├── Incident photos
├── FIR copy (if applicable)
├── Repair estimates
├── Medical reports (health claims)
├── Previous policy (if any)
└── Other supporting documents

CLAIM TIMELINE:
┌─────────────────────────────────────────────────────────────────┐
│ claim_timeline table records every status change                 │
├── action: "status_change", "document_upload", "note_added"      │
├── old_value → new_value                                        │
├── performed_by (user)                                          │
└── automatic timestamp                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.8 Commission & Reconciliation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     COMMISSION CALCULATION & RECONCILIATION                       │
└─────────────────────────────────────────────────────────────────────────────────┘

COMMISSION RULE ENGINE:

┌─────────────────────────────────────────────────────────────────┐
│ commission_rules table:                                          │
│ ├── policy_type: "motor" | "health" | "life"...                 │
│ ├── insurer_name: "ICICI Lombard" | "HDFC ERGO"...              │
│ ├── commission_type: "percentage" | "flat"                        │
│ ├── value: 10 (percent) | 500 (flat amount)                     │
│ ├── min_premium: 1000                                           │
│ ├── max_premium: 1000000                                        │
│ └── isActive: true/false                                        │
└─────────────────────────────────────────────────────────────────┘

CALCULATION FLOW:

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   POLICY    │───▶│  MATCH RULE │───▶│  CALCULATE  │───▶│   STORE     │
│   ISSUED    │    │ (Type+Insurer)│   │  COMMISSION │    │  EXPECTED   │
└─────────────┘    │ + Premium     │    │             │    │             │
                   └─────────────┘    │ % or Flat   │    └──────┬──────┘
                                       └─────────────┘           │
                                                                 │
                                                                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MATCH     │◄───│  RECONCILE  │◄───│  ACTUAL     │◄───│  INSURER  │
│   RESULT    │    │             │    │  PAYOUT     │    │  PAYOUT   │
└─────────────┘    │ (Expected vs │    │  (Bank/     │    │  RECEIVED │
                   │   Actual)   │    │   Statement)│    └─────────────┘
                   └─────────────┘    └─────────────┘

RECONCILIATION STATES:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌───────────────┐                                              │
│  │   MATCHED     │  Expected = Actual                            │
│  │   (Exact)     │                                              │
│  └───────────────┘                                              │
│                                                                 │
│  ┌───────────────┐                                              │
│  │  MISMATCHED   │  Expected ≠ Actual                            │
│  │  (Investigate)│  Flag for manual review                        │
│  └───────────────┘                                              │
│                                                                 │
│  ┌───────────────┐                                              │
│  │   PENDING     │  No payout received yet                        │
│  │   (Wait)      │                                              │
│  └───────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

PAYOUT WORKFLOW:

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PENDING │───▶│ APPROVED │───▶│   PAID   │───▶│  TDS     │
│          │    │  (Mgr)   │    │ (Bank)   │    │ DEDUCTED │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 3. DATA FLOW DIAGRAMS

### 3.1 User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION & AUTHORIZATION                            │
└─────────────────────────────────────────────────────────────────────────────────┘

LOGIN FLOW:

User          Browser             Next.js             Supabase           Database
 │               │                   │                   │                  │
 │── Credentials────────────────────▶│                   │                  │
 │               │                   │── Validate ──────▶│                  │
 │               │                   │                   │── Query ────────▶│
 │               │                   │                   │◀── User ────────│
 │               │                   │◀── JWT Token ─────│                  │
 │               │◀── Set Cookie ─────│                   │                  │
 │◀── Redirect ──│                   │                   │                  │
 │               │                   │                   │                  │

AUTHORIZATION (RLS):

┌─────────────────────────────────────────────────────────────────┐
│ Row Level Security Policies:                                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  policies:                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CREATE POLICY "Users view own branch policies"         │    │
│  │ ON policies FOR SELECT                                  │    │
│  │ USING (branch_id = auth.user_branch_id());             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  customers:                                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ CREATE POLICY "Users view assigned customers"          │    │
│  │ ON customers FOR SELECT                                   │    │
│  │ USING (created_by = auth.uid() OR                       │    │
│  │        assigned_to = auth.uid());                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

ROLE HIERARCHY:

┌──────────┐     ┌──────────┐     ┌──────────┐
│  ADMIN   │────▶│ MANAGER  │────▶│ EMPLOYEE │
│          │     │          │     │          │
├──────────┤     ├──────────┤     ├──────────┤
│ All CRUD │     │ Branch   │     │ Own Data │
│ All Users│     │ Users    │     │ Only     │
│ Settings │     │ Reports  │     │ No Admin │
│ Config   │     │ Approval │     │ Functions│
└──────────┘     └──────────┘     └──────────┘
```

### 3.2 File Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SECURE FILE UPLOAD FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

UPLOAD SEQUENCE:

Client          API (/api/upload)         Supabase Storage
 │                     │                        │
 │── File Metadata ───▶│                      │
 │  (path, mime, size) │                      │
 │                     │── Create Signed URL ─▶│
 │                     │                      │
 │                     │◀── Signed URL ────────│
 │                     │                      │
 │◀── Upload URL ─────│                      │
 │                     │                      │
 │── PUT File ────────────────────────────────▶│
 │  (Direct to Storage)│                      │
 │                     │                      │
 │◀── 200 OK ──────────────────────────────────│
 │                     │                      │
 │                     │                      │

SECURITY VALIDATIONS:

┌─────────────────────────────────────────────────────────────────┐
│ Path Validation:                                                 │
│ ├── Must start with: policies/, documents/, customers/,         │
│ │                    profiles/, leads/, temp/                     │
│ ├── NO ".." (path traversal)                                    │
│ ├── NO absolute paths "/"                                      │
│ └── Max depth: 5 levels                                         │
├──────────────────────────────────────────────────────────────────┤
│ File Validation:                                                 │
│ ├── Max size: 10MB                                              │
│ ├── Allowed types:                                              │
│ │   ├── application/pdf                                         │
│ │   ├── image/jpeg, jpg, png, webp, gif, bmp, tiff               │
│ └── MIME type check (not just extension)                       │
├──────────────────────────────────────────────────────────────────┤
│ Access Control:                                                  │
│ ├── Signed URLs expire in 2 hours                               │
│ ├── RLS on storage.objects                                       │
│ └── User can only access own folder                             │
└─────────────────────────────────────────────────────────────────┘

STORAGE BUCKETS:

┌─────────────────────────────────────────────────────────────────┐
│ 1. policy-documents                                              │
│    └── policies/:customer_id/:policy_id/:filename.pdf           │
│                                                                  │
│ 2. customer-documents                                            │
│    └── customers/:customer_id/:doc_type/:filename               │
│                                                                  │
│ 3. profile-images                                                │
│    └── profiles/:user_id/avatar.:ext                           │
│                                                                  │
│ 4. lead-documents                                                │
│    └── leads/:lead_id/:filename                                │
│                                                                  │
│ 5. temp-uploads                                                  │
│    └── temp/:session_id/:filename (auto-cleanup)                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 PDF Extraction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AI-POWERED PDF EXTRACTION                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

EXTRACTION PIPELINE:

PDF Upload ──▶ Parse PDF ──▶ AI Analysis ──▶ Structured Data ──▶ Validation
                  │              │                  │                │
                  │              │                  │                ▼
                  │              │                  │         ┌──────────────┐
                  │              │                  │         │   OUTPUT   │
                  │              │                  │         │            │
                  │              │                  │         │ Customer   │
                  │              │                  │         │ Policy     │
                  │              │                  │         │ Motor      │
                  │              │                  │         └──────────────┘
                  │              │                  │
                  │              │                  ▼
                  │              │         ┌───────────────────┐
                  │              │         │  policyDetails:   │
                  │              │         │  customerDetails: │
                  │              │         │  motorDetails:    │
                  │              │         └───────────────────┘
                  │              │
                  │              ▼
                  │    ┌───────────────────┐
                  │    │ Google Gemini AI  │
                  │    │                   │
                  │    │ "Extract policy   │
                  │    │  number, customer │
                  │    │  name, vehicle    │
                  │    │  details..."      │
                  │    └───────────────────┘
                  │
                  ▼
         ┌───────────────────┐
         │   pdf-parse       │
         │   (Text extract)  │
         └───────────────────┘

FALLBACK STRATEGY:

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │  GEMINI AI  │───▶│  Missing    │───▶│   REGEX     │        │
│  │  RESPONSE   │    │   FIELDS?   │    │  FALLBACK   │        │
│  └─────────────┘    └──────┬──────┘    └─────────────┘        │
│                             │                                   │
│                             │ (No)                              │
│                             ▼                                   │
│                      ┌─────────────┐                            │
│                      │    DONE     │                            │
│                      └─────────────┘                            │
│                                                                  │
│  REGEX PATTERNS:                                                 │
│  ├── Policy Number: /Policy\s*No\.?\s*[:]?\s*([A-Z0-9\/-]+)/i   │
│  ├── Premium: /Premium[^\d]*(\d+(?:,\d{3})*(?:\.\d{2})?)/       │
│  ├── Vehicle: /([A-Z]{2}\d{2}[A-Z]{1,2}\d{4})/i                │
│  └── ... 20+ patterns                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. INTEGRATION POINTS

### 4.1 External Services Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICE INTEGRATIONS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

SUPABASE (Primary Backend):
┌─────────────────────────────────────────────────────────────────┐
│ ├── PostgreSQL Database                                          │
│ ├── Authentication (JWT)                                         │
│ ├── Storage (File uploads)                                       │
│ ├── Realtime (Live updates)                                      │
│ ├── Edge Functions (Background jobs)                              │
│ └── pg_cron (Scheduled tasks)                                    │
└─────────────────────────────────────────────────────────────────┘

GOOGLE GEMINI (AI):
┌─────────────────────────────────────────────────────────────────┐
│ ├── PDF text extraction                                          │
│ ├── Structured data parsing                                      │
│ ├── Multi-insurer support                                        │
│ └── 10-15s processing time                                       │
└─────────────────────────────────────────────────────────────────┘

SENTRY (Monitoring):
┌─────────────────────────────────────────────────────────────────┐
│ ├── Error tracking (client/server/edge)                         │
│ ├── Performance monitoring                                       │
│ ├── Release tracking                                              │
│ └── Alert notifications                                          │
└─────────────────────────────────────────────────────────────────┘

EMAIL (SMTP):
┌─────────────────────────────────────────────────────────────────┐
│ ├── Nodemailer integration                                       │
│ ├── Gmail/Custom SMTP support                                    │
│ ├── HTML templates                                               │
│ └── Bulk email capability                                        │
└─────────────────────────────────────────────────────────────────┘

VERCEL ANALYTICS:
┌─────────────────────────────────────────────────────────────────┐
│ ├── Web Vitals tracking                                          │
│ ├── Performance insights                                         │
│ └── Traffic analysis                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Internal Service Communication

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         INTERNAL SERVICE ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          UI LAYER                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Components│ │  Hooks   │ │  Forms   │ │  Tables  │          │
│  │ (React)  │ │  (SWR)   │ │(HookForm)│ │(Shadcn)  │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴─────────────┴─────────────┘                │
│                          │                                      │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                          ▼                                    │
│                     SERVICE LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  lib/services/                                         │  │
│  │  ├── customer.service.ts    (25KB)                    │  │
│  │  ├── policy.service.ts      (14KB)                    │  │
│  │  ├── lead.service.ts        (20KB)                    │  │
│  │  ├── commission.service.ts  (14KB)                    │  │
│  │  ├── email.service.ts       (40KB)                    │  │
│  │  └── 25+ more services...                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                          ▼                                    │
│                    DATABASE LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Supabase Client                                        │  │
│  │  ├── supabase/ssr.ts (Server)                          │  │
│  │  ├── supabase/client.ts (Browser)                     │  │
│  │  └── supabase/admin.ts (Service Role)                  │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │              ┌─────────────────────┐                   │  │
│  │              │   PostgreSQL         │                   │  │
│  │              │   ├─ 40+ tables     │                   │  │
│  │              │   ├─ RLS policies   │                   │  │
│  │              │   └─ Triggers       │                   │  │
│  │              └─────────────────────┘                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. STATE MACHINES

### 5.1 Policy State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         POLICY STATUS STATE MACHINE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────┐
           ┌───────────▶│   DRAFT    │◀───────────┐
           │            │  (Intake)  │            │
           │            └──────┬─────┘            │
           │                   │                  │
           │                   ▼                  │
           │            ┌─────────────┐           │
           │            │  PENDING   │           │
           │            │VERIFICATION│           │
           │            └──────┬─────┘           │
           │                   │                  │
           │                   ▼                  │
           │            ┌─────────────┐           │
           │         ┌──│   ACTIVE   │──┐        │
           │         │  │ (Verified) │  │        │
           │         │  └──────┬─────┘  │        │
           │         │         │        │        │
           │         │         ▼        │        │
           │         │  ┌─────────────┐  │        │
           │         └──│  EXPIRED  │──┘        │
           │            │ (Auto on    │           │
           │            │  end_date)  │           │
           │            └──────┬─────┘           │
           │                   │                  │
           │                   ▼                  │
           │            ┌─────────────┐           │
           │            │  RENEWAL   │───────────┘
           │            │   DUE      │
           │            └─────────────┘
           │
           │     ┌─────────────┐
           └────▶│  CANCELLED  │
                 │  (Manual)   │
                 └─────────────┘

TRANSITION RULES:
┌─────────────────────────────────────────────────────────────────┐
│ draft ──▶ pending: On intake submit                              │
│ pending ──▶ active: After verification                          │
│ active ──▶ expired: Auto on end_date                             │
│ expired ──▶ renewal_due: 30-60 days before expiry              │
│ renewal_due ──▶ active: On successful renewal                    │
│ any ──▶ cancelled: Manual admin action (with reason)            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Lead State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SALES LEAD STATUS STATE MACHINE                         │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   NEW   │───▶│CONTACTED │───▶│FOLLOW_UP │───▶│INTERESTED│───▶│MEETING_  │
│         │    │          │    │          │    │          │    │ DONE     │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                                    │
                                                                    ▼
                                                             ┌──────────┐
                                                             │ PROPOSAL │
                                                             │  SENT    │
                                                             └────┬─────┘
                                                                  │
                              ┌───────────────────────────────────┼──────────┐
                              │                                   │          │
                              ▼                                   ▼          ▼
                       ┌──────────┐                       ┌──────────┐ ┌──────────┐
                       │NEGOTIATION│                       │ CONVERTED│ │   LOST   │
                       │          │                       │          │ │          │
                       └────┬─────┘                       └──────────┘ └──────────┘
                            │                                        │
                            │                                        │
                            ▼                                        │
                     ┌──────────┐                                     │
                     │  LOST    │─────────────────────────────────────┘
                     │(Price/etc│
                     └──────────┘

CONVERTED ACTION:
┌─────────────────────────────────────────────────────────────────┐
│ On status = "converted":                                        │
│ 1. Create customer record (if new)                              │
│ 2. Create policy record                                         │
│ 3. Copy lead documents to policy                                │
│ 4. Set converted_customer_id, converted_at                      │
│ 5. Create timeline entry                                        │
│ 6. Send notification                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Service Ticket State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SERVICE TICKET STATUS STATE MACHINE                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  OPEN   │───▶│IN_PROGRESS│───▶│  PENDING  │────│ RESOLVED  │
│         │    │           │    │  (Info)   │    │           │
└─────────┘    └───────────┘    └─────┬─────┘    └─────┬─────┘
                                      │                │
                                      │ (External)       │
                                      ▼                  │
                               ┌───────────┐             │
                               │ PENDING_  │─────────────┘
                               │ CUSTOMER  │
                               │ (Waiting) │
                               └─────┬─────┘
                                     │
                                     │ (Info received)
                                     ▼
                               ┌───────────┐
                               │IN_PROGRESS│
                               │  (Return) │
                               └───────────┘

ESCALATION:
┌─────────────────────────────────────────────────────────────────┐
│ sla_deadline < NOW() ──▶ escalation_level++                    │
│ escalation_level: 1 (Manager), 2 (Director), 3 (Admin)         │
│ Each level triggers notifications to higher authority            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. DATABASE RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CORE ENTITY RELATIONSHIPS                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐          │
│   │    USERS     │◄────────│   BRANCHES   │────────▶│   POLICIES   │          │
│   │              │  N:M    │              │  1:M    │              │          │
│   └──────┬───────┘         └──────────────┘         └──────┬───────┘          │
│          │                                                  │                  │
│          │ N:1                                              │ 1:M               │
│          │                                                  │                  │
│          ▼                                                  ▼                  │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐          │
│   │   CUSTOMERS  │◄────────│ SALES_LEADS  │◄────────│    QUOTES    │          │
│   │              │  1:M    │              │  1:M    │              │          │
│   └──────┬───────┘         └──────┬───────┘         └──────────────┘          │
│          │                        │                                            │
│          │ 1:M                   │ 1:M                                         │
│          │                        │                                            │
│          ▼                        ▼                                            │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐          │
│   │  KYC_DOCS    │         │  PROPOSALS   │────────▶│  CLAIMS      │          │
│   │              │         │              │  1:M    │              │          │
│   └──────────────┘         └──────┬───────┘         └──────────────┘          │
│                                   │                                            │
│                                   │ 1:1                                          │
│                                   │                                            │
│                                   ▼                                            │
│                            ┌──────────────┐                                   │
│                            │   POLICIES   │ (Converted)                        │
│                            │   (again)    │                                   │
│                            └──────────────┘                                   │
│                                                                                 │
│   RELATED ENTITIES:                                                            │
│   ├── RENEWALS ──▶ POLICIES                                                     │
│   ├── PREMIUMS ──▶ POLICIES                                                     │
│   ├── COMMISSIONS ──▶ POLICIES + USERS                                          │
│   ├── ENDORSEMENTS ──▶ POLICIES                                                 │
│   ├── INVOICES ──▶ POLICIES + CUSTOMERS                                         │
│   ├── SERVICE_TICKETS ──▶ CUSTOMERS + POLICIES                                  │
│   ├── ATTENDANCE ──▶ USERS                                                      │
│   └── AUDIT_LOGS ──▶ USERS (universal)                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. REALTIME DATA FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE REALTIME INTEGRATION                           │
└─────────────────────────────────────────────────────────────────────────────────┘

SUBSCRIPTION PATTERN:

┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Client  │◄────▶│  useRealtime Hook │◄────▶│ Supabase │◄────▶│  Database │
│  (UI)    │      │          │      │ Realtime │      │         │
└──────────┘      └──────────┘      └──────────┘      └──────────┘

ENABLED TABLES (Realtime):
┌─────────────────────────────────────────────────────────────────┐
│ ✅ notifications     │ New notification triggers toast            │
│ ✅ policies          │ Live policy updates                        │
│ ✅ sales_leads       │ Kanban board updates                        │
│ ✅ service_tickets   │ Ticket status changes                       │
│ ✅ attendance        │ Check-in/check-out live                     │
│ ✅ commissions       │ Payout status updates                       │
│ ✅ audit_logs        │ Real-time activity feed                     │
│ ✅ system_config     │ Settings changes                            │
└─────────────────────────────────────────────────────────────────┘

EXAMPLE: Lead Kanban Realtime Update

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  User A:                                                         │
│  ┌──────────┐         ┌──────────┐         ┌──────────┐        │
│  │  Drag    │────────▶│  Drop on │────────▶│   NEW    │        │
│  │  Card    │         │  Column  │         │  STATUS   │        │
│  │  "NEW"──▶│         │ "CONTACTED"        │ "CONTACTED"       │
│  └──────────┘         └──────────┘         └──────────┘        │
│                                          │                       │
│                                          │ UPDATE sales_leads    │
│                                          │ SET status='contacted'│
│                                          ▼                       │
│                               ┌──────────────────┐               │
│                               │  Supabase Realtime│               │
│                               │  Broadcasts Event │               │
│                               └────────┬─────────┘               │
│                                        │                         │
│                    ┌───────────────────┼───────────────────┐   │
│                    │                   │                   │   │
│                    ▼                   ▼                   ▼   │
│             ┌──────────┐        ┌──────────┐        ┌──────────┐│
│             │ User B   │        │ User C   │        │ User D   ││
│             │ (Kanban) │        │ (List)   │        │ (Detail) ││
│             │ Card moves│        │ Status   │        │ Timeline ││
│             │ visually  │        │ updates  │        │ updates  ││
│             └──────────┘        └──────────┘        └──────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*End of Module Flows Documentation*

**Note**: This document contains the complete workflow architecture for the BP & AF Insurance CRM system. For implementation details, refer to the respective service files in `lib/services/` and API routes in `app/api/`.
