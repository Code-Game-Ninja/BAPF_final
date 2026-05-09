# PDF Extraction Improvements - Training Summary

## Overview
Improved the PDF extraction regex patterns in `lib/helpers/pdf-extractor.ts` based on analysis of 6 sample PDFs from `public/pdf/`. The improvements focus on handling quotations, commercial policies, and various insurer formats.

## Sample PDFs Analyzed

1. **25 Hari Kisan.pdf** - Personal Accident (Reliance) - 27 pages
2. **apnGreenEnergy.pdf** - Marine Open Policy (ICICI Lombard) - 9 pages
3. **IIT Kanpur_Final_18Months.pdf** - CAR Policy Quotation (Bajaj) - 3 pages
4. **LF_POLICYSCHEDULEFIRELF_86857845(1).pdf** - Fire Policy (New India) - 20 pages
5. **RENEW_161122_SH36686_BA0000388292_HFHOSTD8_260412_612787242886.pdf** - Health Renewal (Star Health) - 2 pages
6. **SHWETDHARA_MARINE.pdf** - Marine Quotation (Bajaj) - 4 pages

## Key Issues Identified

### 1. Customer Name Extraction
**Problem**: Gemini AI was hallucinating policy clause text as customer names
- Example: "For Third Party Liability Claims arising out of Acts of God..."
- Intermediary names were being extracted instead of actual customer names

**Solution**: 
- Added `sanitizeName()` function to reject policy clause keywords
- Prioritized "Customer Name", "Proposer Name", "Policyholder Name" patterns
- Added validation to reject lowercase-heavy text and numbers
- Filter out intermediary-specific labels (Sub IMD, IMD Code, Branch Office)

### 2. Policy Number Extraction
**Problem**: 
- UIN codes (V02202223) and CIN codes (U66010PN2000PLC015329) were being extracted as policy numbers
- Intermediary codes (BA0000388292, SH36686) were being extracted
- Quotation numbers were not being recognized

**Solution**:
- Added quotation number patterns (QU-26-1302-1005-00000076)
- Added quote reference patterns (BAGIC-ENG-...)
- Added Star Health 13-16 digit format
- Added filters to skip UIN, CIN, and intermediary codes
- Prioritized specific formats over generic patterns

### 3. Sum Insured Extraction
**Problem**:
- Large commercial values (5,000,000,000) were not being extracted
- Marine and CAR policy formats were not recognized
- Health table formats were missed

**Solution**:
- Added Marine-specific patterns: "Total Sum Insured(in INR) 5,000,000,000.00"
- Added CAR-specific patterns: "Section I (Material Damage) ... 1,207,539,494"
- Added Health table format: "Sum Insured(Rs.) 4,00,000"
- Added Personal Accident: "Base Sum Insured: 1000000"
- Prioritized specific formats before generic patterns

### 4. Premium Extraction
**Problem**:
- Quotation premium formats were not recognized
- CAR/EAR "Total Premium With GST" format was missed
- Health renewal premium format was not captured

**Solution**:
- Added quotation format: "Gross Premium(in INR) 5,19,201.00"
- Added CAR format: "Total Premium With GST 968,930"
- Added renewal format: "Total Renewal Premium 17,142"
- Prioritized specific formats before generic patterns

### 5. Date Extraction
**Problem**:
- Quotation date formats were not recognized
- CAR project dates were missed
- Health renewal dates were not captured
- Various time formats (12:00:01 AM) were causing issues

**Solution**:
- Added quotation format: "From: 11-NOV-2025 and To: 10-NOV-2026"
- Added CAR format: "Project Start Date * 30/07/2025 Project End date 30/01/2027"
- Added renewal format: "renewal on 12-Apr-2026"
- Added Fire format: "Period of Insurance : From: 01/01/2026 12:00:01 AM To: 31/12/2026 11:59:59 PM"
- Added fallback patterns for "Policy End Date 30/01 /2027" (with space)

## Pattern Priority Strategy

All patterns now follow a priority-based approach:

1. **Specific formats first** (quotations, CAR, marine, health table formats)
2. **Insurer-specific formats** (ICICI Lombard, Bajaj, New India, Star Health)
3. **Generic patterns last** (fallback for unknown formats)

This ensures that specific, well-structured data is extracted before falling back to generic patterns that might capture incorrect data.

## Validation Improvements

### Customer Name Validation
- Reject if contains policy clause keywords (30+ keywords)
- Reject if mostly lowercase (< 30% uppercase)
- Reject if contains numbers (except Roman numerals)
- Reject common non-name words

### Policy Number Validation
- Skip UIN codes (V followed by digits)
- Skip CIN codes (Corporate Identity Number format)
- Skip intermediary codes (BA0000388292, SH36686 patterns)
- Must contain at least one digit
- Must not be a common word

### Sum Insured Validation
- Must be > 0 and < 1 trillion
- Handles large commercial values (billions)
- Validates reasonable ranges

## Testing Recommendations

To verify the improvements:

1. **Upload each sample PDF** through the intake flow
2. **Check the SideBySideReview screen** to see extracted fields
3. **Expected improvements**:
   - Customer names should be actual customers, not intermediaries or clause text
   - Policy numbers should be actual policy/quotation numbers, not UIN/CIN codes
   - Sum insured should capture large commercial values (billions)
   - Premium should capture quotation and renewal formats
   - Dates should capture all formats including quotations and renewals

## Files Modified

- `lib/helpers/pdf-extractor.ts` - Main extraction logic with improved regex patterns

## Next Steps

1. Test the improved patterns with the 6 sample PDFs
2. Monitor extraction accuracy in production
3. Add more patterns as new PDF formats are encountered
4. Consider adding insurer-specific extraction modules for complex formats

## Notes

- The regex patterns are now more robust but still rely on consistent PDF structure
- Gemini AI fallback is still in place for when regex fails
- The improvements focus on Indian insurance policy formats
- All patterns handle Indian number formats (52,72,60,899)
- All patterns handle multiple date formats (DD/MM/YYYY, DD-Mon-YYYY, etc.)
