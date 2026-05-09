# Issue Policy Button Fix

## Problem
When clicking the "ISSUE POLICY" button on a business case detail page, the application crashed with the following error:

```
TypeError: customerService.getCustomer is not a function
at IntakeDeskPage.useEffect (app/dashboard/intake/page.tsx:123:25)
```

## Root Cause
The intake page was calling `customerService.getCustomer(customerId)`, but the `customerService` object doesn't export a `getCustomer` method. Instead, it exports `getById` which internally calls the `getCustomer` function.

### Customer Service Export Structure
```typescript
export const customerService = {
  getById: (id: string) => getCustomer(id),  // ✅ Correct method
  // ... other methods
}
```

## Solution
Changed the method call in `app/dashboard/intake/page.tsx` from:
```typescript
customerService.getCustomer(customerId)  // ❌ Wrong
```

to:
```typescript
customerService.getById(customerId)  // ✅ Correct
```

## Additional Improvements
Added null check to handle cases where customer is not found:
```typescript
customerService.getById(customerId).then((cust) => {
  if (cust) {
    console.log('[Intake] Loaded customer from URL:', cust.name);
    setCustomer(cust);
    setProductData((prev: any) => ({
      ...prev,
      name: cust.name,
      phone: cust.phone,
    }));
  } else {
    console.warn('[Intake] Customer not found:', customerId);
  }
})
```

## Flow Overview
1. User clicks "ISSUE POLICY" button on business case detail page
2. Button handler navigates to `/dashboard/intake?category=...&customer_id=...&case_id=...`
3. Intake page's `useEffect` detects `customer_id` query parameter
4. Calls `customerService.getById(customerId)` to fetch customer data
5. Pre-fills customer name and phone in the intake form
6. User proceeds through the 7-step intake flow to create the policy

## Files Modified
- `app/dashboard/intake/page.tsx` (line 123)

## Testing Checklist
- [x] TypeScript compilation passes
- [ ] Click "ISSUE POLICY" button on business case detail page
- [ ] Verify customer data loads correctly in intake form
- [ ] Complete intake flow and verify policy is created
- [ ] Check that business case status updates to "won" after policy creation

## Status
✅ **FIXED** - Method name corrected, null check added, TypeScript errors resolved
