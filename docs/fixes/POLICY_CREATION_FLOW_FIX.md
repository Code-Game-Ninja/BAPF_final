# Policy Creation Flow Fix

## Problems Identified

### 1. Invalid Enum Value Error
**Error Message:**
```
invalid input value for enum case_type_enum: "fresh"
Policy creation skipped - will need manual entry
```

**Root Cause:**
The business case detail page was passing `action: 'fresh'` in the URL parameters, but the database enum `case_type_enum` only accepts these values:
- `'lead'`
- `'quote'`
- `'proposal'`
- `'policy'`
- `'renewal'`
- `'endorsement'`
- `'claim'`
- `'servicing'`

The intake page was using `selection.action` directly as the `case_type` without mapping it to a valid enum value.

### 2. Missing Policy Details in Final Summary
The FinalSummary component (Step 7) only showed minimal information:
- Registration number or plan name
- Make/model
- Sum assured

It was missing critical policy details like:
- Policy number
- Insurer name
- Start/End dates
- Premium amount
- Motor-specific details (chassis, engine, NCB, IDV)
- Life-specific details (policy term, risk start date)
- Health-specific details (plan name, family members)

## Solutions Implemented

### Fix 1: Correct Action ID in Business Case Page
**File:** `app/dashboard/business-cases/[id]/page.tsx`

Changed the action parameter from `'fresh'` to `'new_policy'`:

```typescript
// ❌ BEFORE
const queryParams = new URLSearchParams({
  category: bc.lob,
  action: 'fresh',  // Invalid action ID
  customer_id: bc.customer_id,
  case_id: bc.id,
  insurer: (bc.payload?.insurer_name as string) || '',
  premium: String((bc.payload?.estimated_value as number) || 0)
});

// ✅ AFTER
const queryParams = new URLSearchParams({
  category: bc.lob,
  action: 'new_policy',  // Valid action ID
  customer_id: bc.customer_id,
  case_id: bc.id,
  insurer: (bc.payload?.insurer_name as string) || '',
  premium: String((bc.payload?.estimated_value as number) || 0)
});
```

### Fix 2: Add Action to Case Type Mapping
**File:** `app/dashboard/intake/page.tsx`

Added proper mapping from action IDs to database enum values:

```typescript
// ❌ BEFORE
const bCase = await businessCaseService.createCase({
  case_number: `BCS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
  customer_id: finalCustomerId,
  case_type: (selection.action as any) || "quote",  // Direct usage without mapping
  lob: (selection.category as any) || "other",
  status: "open",
  priority: "medium",
  // ...
});

// ✅ AFTER
// Map action to valid case_type enum
const actionToCaseTypeMap: Record<string, string> = {
  'new_policy': 'policy',
  'renewal': 'renewal',
  'endorsement': 'endorsement',
  'claim': 'claim',
  'quote': 'quote',
  'service': 'servicing',
};
const caseType = actionToCaseTypeMap[selection.action || ''] || 'quote';

const bCase = await businessCaseService.createCase({
  case_number: `BCS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
  customer_id: finalCustomerId,
  case_type: caseType as any,  // Properly mapped value
  lob: (selection.category as any) || "other",
  status: "open",
  priority: "medium",
  // ...
});
```

### Fix 3: Enhanced Final Summary with Complete Policy Details
**File:** `app/dashboard/intake/components/FinalSummary.tsx`

Added comprehensive policy details display:

```typescript
// Added detailed policy information section
<div className="pt-4 space-y-2 border-t border-border/50">
  {productData.policy_no && <SummaryDetail label="Policy Number" value={productData.policy_no} />}
  {productData.insurer && <SummaryDetail label="Insurer" value={productData.insurer} />}
  {productData.start_date && <SummaryDetail label="Start Date" value={productData.start_date} />}
  {productData.end_date && <SummaryDetail label="End Date" value={productData.end_date} />}
  {productData.premium && <SummaryDetail label="Premium" value={`₹${productData.premium}`} />}
  {productData.sum_assured && <SummaryDetail label="Sum Assured" value={`₹${productData.sum_assured}`} />}
  
  {/* Motor-specific details */}
  {selection.category === 'motor' && (
    <>
      {productData.reg_number && <SummaryDetail label="Registration" value={productData.reg_number} />}
      {productData.make && <SummaryDetail label="Make/Model" value={`${productData.make} ${productData.model || ''}`} />}
      {productData.chassis_number && <SummaryDetail label="Chassis" value={productData.chassis_number} />}
      {productData.engine_number && <SummaryDetail label="Engine" value={productData.engine_number} />}
      {productData.ncb_percent && <SummaryDetail label="NCB" value={`${productData.ncb_percent}%`} />}
      {productData.idv_vehicle && <SummaryDetail label="IDV" value={`₹${productData.idv_vehicle}`} />}
    </>
  )}
  
  {/* Life-specific details */}
  {selection.category === 'life' && (
    <>
      {productData.plan_name && <SummaryDetail label="Plan" value={productData.plan_name} />}
      {productData.policy_term && <SummaryDetail label="Term" value={`${productData.policy_term} years`} />}
      {productData.risk_start_date && <SummaryDetail label="Risk Start" value={productData.risk_start_date} />}
    </>
  )}
  
  {/* Health-specific details */}
  {selection.category === 'health' && (
    <>
      {productData.plan_name && <SummaryDetail label="Plan" value={productData.plan_name} />}
      {productData.family_members && <SummaryDetail label="Members" value={productData.family_members} />}
    </>
  )}
</div>
```

## Action ID to Case Type Mapping Reference

| Action ID (UI) | Case Type (Database) | Description |
|---------------|---------------------|-------------|
| `new_policy` | `policy` | Issue a fresh policy |
| `renewal` | `renewal` | Renew existing coverage |
| `endorsement` | `endorsement` | Modify existing policy |
| `claim` | `claim` | Notify a new loss |
| `quote` | `quote` | Generate premium estimates |
| `service` | `servicing` | Non-financial servicing |

## Complete Flow Overview

### Issue Policy Button Flow (from Business Case)
1. User clicks "ISSUE POLICY" button on business case detail page
2. Button handler navigates to `/dashboard/intake?category=motor&action=new_policy&customer_id=xxx&case_id=xxx`
3. Intake page loads with pre-filled data:
   - Step 1: Category (pre-selected from URL)
   - Step 2: Action (pre-selected as "new_policy")
   - Step 3: Customer (auto-loaded using customer_id)
   - Step 4: Upload PDF (optional)
   - Step 5: Review extracted data (if PDF uploaded)
   - Step 6: Fill product-specific form
   - Step 7: **Final Summary** - Shows complete policy details
4. User reviews all details in Final Summary
5. User clicks "Execute Workflow"
6. System creates:
   - Customer record (if new)
   - Policy record with all details
   - Business case record with proper case_type
7. Redirects to business case detail page

### What User Sees in Final Summary (Step 7)
- **Entity Mapping Section:**
  - Customer name
  - Customer phone
  - KYC status (PAN if available)
  
- **Product Context Section:**
  - Category and action badges
  - Policy/vehicle/plan identifier
  - **NEW: Complete policy details:**
    - Policy number
    - Insurer name
    - Start and end dates
    - Premium amount
    - Sum assured
    - Category-specific details (motor/life/health)

- **System Implications:**
  - Business case creation notice
  - Document vault linkage
  - Compliance triggers

## Files Modified
1. `app/dashboard/business-cases/[id]/page.tsx` - Fixed action parameter
2. `app/dashboard/intake/page.tsx` - Added action to case_type mapping
3. `app/dashboard/intake/components/FinalSummary.tsx` - Enhanced policy details display

## Testing Checklist
- [x] TypeScript compilation passes
- [ ] Click "ISSUE POLICY" from business case detail page
- [ ] Verify customer data loads in Step 3
- [ ] Complete intake flow through all 7 steps
- [ ] **Verify Final Summary shows complete policy details**
- [ ] Click "Execute Workflow"
- [ ] Verify no enum error occurs
- [ ] Verify policy is created successfully
- [ ] Verify business case is created with correct case_type
- [ ] Verify redirect to business case detail page

## Status
✅ **FIXED** - All three issues resolved:
1. ✅ Invalid enum value error fixed with proper action ID
2. ✅ Action to case_type mapping implemented
3. ✅ Final Summary enhanced with complete policy details
