# Sentry Dashboard Usage Guide
## How to Use Sentry for Error Tracking

**Last Updated**: January 2025

---

## What is Sentry?

Sentry is a professional error tracking service that automatically captures errors from your application and provides detailed debugging information.

Think of it as a "black box recorder" for your application - it records everything that goes wrong so you can fix it.

---

## Setting Up Sentry

### Step 1: Create Sentry Account

1. Go to https://sentry.io
2. Click "Sign Up" (free tier available)
3. Choose "Next.js" as your platform
4. Create a new project

### Step 2: Get Your DSN

After creating a project, you'll see a **DSN** (Data Source Name) that looks like:

```
https://abc123def456@o123456.ingest.sentry.io/789012
```

Copy this DSN.

### Step 3: Configure Your App

Add the DSN to your `.env.local` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/789012
```

### Step 4: Restart Your App

```bash
npm run dev
```

That's it! Sentry is now tracking errors.

---

## Using the Sentry Dashboard

### Accessing the Dashboard

1. Go to https://sentry.io
2. Log in
3. Select your project

### Dashboard Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Sentry Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Issues (12)          Performance          Releases          │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🔴 Database connection failed              5 events        │
│     Last seen: 2 minutes ago                                │
│     First seen: 1 hour ago                                  │
│                                                              │
│  🟠 PDF extraction timeout                  3 events        │
│     Last seen: 10 minutes ago                               │
│     First seen: 30 minutes ago                              │
│                                                              │
│  🟡 Slow API response                       8 events        │
│     Last seen: 5 minutes ago                                │
│     First seen: 2 hours ago                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Understanding Issues

### Issue Details

When you click on an issue, you see:

```
┌─────────────────────────────────────────────────────────────┐
│  Database connection failed                                  │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Error Message:                                              │
│  Connection timeout after 5000ms                             │
│                                                              │
│  Stack Trace:                                                │
│  at connectToDatabase (lib/database.ts:45)                  │
│  at createPolicy (lib/services/policy.service.ts:123)       │
│  at POST (app/api/policies/route.ts:87)                     │
│                                                              │
│  User:                                                       │
│  john@example.com (ID: 123)                                 │
│  Role: admin                                                 │
│                                                              │
│  Request:                                                    │
│  POST /api/policies                                          │
│  Body: { policyNumber: "12345", ... }                       │
│                                                              │
│  Environment:                                                │
│  Browser: Chrome 120                                         │
│  OS: Windows 11                                              │
│  IP: 192.168.1.100                                           │
│                                                              │
│  Timeline:                                                   │
│  [10:30:00] User clicked "Create Policy"                    │
│  [10:30:01] API call started                                │
│  [10:30:06] Connection timeout                              │
│  [10:30:06] Error captured                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Issue Severity

- 🔴 **Fatal** - Critical errors (database down, app crash)
- 🟠 **Error** - Regular errors (API failures, validation errors)
- 🟡 **Warning** - Warnings (slow operations, deprecations)
- 🔵 **Info** - Information (user actions, events)

---

## Key Features

### 1. Error Grouping

Sentry automatically groups similar errors together.

**Example**:
- "Database connection failed" - 5 occurrences
- "PDF extraction timeout" - 3 occurrences
- "Invalid email format" - 12 occurrences

This helps you prioritize which errors to fix first.

### 2. Stack Traces

Every error includes a full stack trace showing:
- Which file the error occurred in
- Which line number
- The full call stack
- Variable values at the time of error

**Example**:
```
Error: Connection timeout
  at connectToDatabase (lib/database.ts:45:10)
  at createPolicy (lib/services/policy.service.ts:123:5)
  at POST (app/api/policies/route.ts:87:12)
```

### 3. User Context

Know which user experienced the error:
- User ID
- Email address
- Role
- IP address
- Browser/OS

**Example**:
```
User: john@example.com
ID: 123
Role: admin
Browser: Chrome 120
OS: Windows 11
```

### 4. Request Context

See what the user was doing:
- URL
- HTTP method
- Request body
- Headers
- Query parameters

**Example**:
```
POST /api/policies
Body: {
  "policyNumber": "12345",
  "customerName": "John Doe",
  "premium": 5000
}
```

### 5. Breadcrumbs

See the sequence of events leading to the error:

```
Timeline:
[10:30:00] User navigated to /dashboard/policies
[10:30:05] User clicked "Create Policy" button
[10:30:06] Form submitted
[10:30:07] API call to POST /api/policies
[10:30:12] Database query started
[10:30:17] Connection timeout
[10:30:17] Error captured
```

### 6. Performance Monitoring

Track slow operations:
- API response times
- Database query times
- Page load times
- Transaction traces

**Example**:
```
POST /api/policies - 5.2s
├─ Database query - 4.8s (slow!)
├─ PDF generation - 0.3s
└─ Email sending - 0.1s
```

---

## Common Use Cases

### Use Case 1: User Reports "App is Broken"

**Without Sentry**:
1. User calls: "The app is broken!"
2. You ask: "What were you doing?"
3. User: "I don't remember"
4. You: "Can you try again?"
5. User: "It works now..."
6. Result: No idea what went wrong

**With Sentry**:
1. User calls: "The app is broken!"
2. You open Sentry dashboard
3. You see: "Database connection failed" at 10:30 AM
4. You see: User was john@example.com
5. You see: He was creating policy #12345
6. You see: Database timeout after 5 seconds
7. You fix: Increase database connection timeout
8. Result: Problem solved in 5 minutes

### Use Case 2: Slow Performance

**Without Sentry**:
1. Users complain app is slow
2. You don't know which part is slow
3. You guess and optimize random things
4. Still slow
5. Result: Wasted time

**With Sentry**:
1. Open Sentry Performance tab
2. See: PDF extraction takes 15 seconds
3. See: Database query takes 12 seconds
4. Fix: Add database index
5. Result: Now takes 2 seconds

### Use Case 3: Production Error

**Without Sentry**:
1. Error happens in production
2. No logs available
3. Can't reproduce locally
4. Result: Can't fix

**With Sentry**:
1. Error happens in production
2. Sentry captures full context
3. You see exact error, stack trace, user data
4. You reproduce locally with same data
5. You fix and deploy
6. Result: Fixed in 30 minutes

---

## Sentry Alerts

### Setting Up Alerts

1. Go to **Settings** → **Alerts**
2. Click **Create Alert Rule**
3. Choose trigger:
   - New issue
   - Issue frequency (e.g., >10 errors/hour)
   - Issue severity (e.g., fatal errors)
4. Choose action:
   - Email
   - Slack
   - PagerDuty
   - Webhook

### Example Alert Rules

**Rule 1: Critical Errors**
```
When: New fatal error occurs
Then: Send email to admin@yourcompany.com
      AND post to #alerts Slack channel
```

**Rule 2: High Error Rate**
```
When: More than 10 errors in 1 hour
Then: Send email to team@yourcompany.com
```

**Rule 3: Slow Performance**
```
When: API response time > 5 seconds
Then: Post to #performance Slack channel
```

---

## Best Practices

### DO ✅

1. **Check Sentry Daily**
   - Review new issues
   - Prioritize by frequency
   - Fix critical errors first

2. **Add Context**
   - Include user info
   - Include request data
   - Include custom metadata

3. **Set Up Alerts**
   - Email for critical errors
   - Slack for team awareness
   - PagerDuty for on-call

4. **Resolve Issues**
   - Mark as resolved when fixed
   - Add resolution notes
   - Track in next release

5. **Monitor Trends**
   - Are errors increasing?
   - Are new errors appearing?
   - Are old errors recurring?

### DON'T ❌

1. **Don't Ignore Warnings**
   - Warnings become errors
   - Fix them early

2. **Don't Disable Sentry**
   - Even in development
   - Catch errors early

3. **Don't Send Sensitive Data**
   - No passwords
   - No credit card numbers
   - No API keys

4. **Don't Overwhelm**
   - Filter noise
   - Group similar errors
   - Set reasonable thresholds

---

## Sentry vs Your Dashboard

### Your Dashboard (`/dashboard/monitoring`)

**Best for**:
- Real-time system stats
- Quick overview
- Internal team use
- Custom metrics

**Shows**:
- Total requests
- Average response time
- Error count
- Recent errors

### Sentry Dashboard

**Best for**:
- Detailed error analysis
- Stack traces
- User context
- Performance monitoring

**Shows**:
- Full error details
- Stack traces
- User information
- Request context
- Breadcrumbs
- Performance traces

### Use Both!

- **Your Dashboard**: Daily monitoring, quick checks
- **Sentry**: Deep debugging, error analysis

---

## Troubleshooting Sentry

### Issue: No Errors Appearing

**Check**:
1. DSN is set in `.env.local`
2. App is restarted after adding DSN
3. Errors are actually occurring
4. Network connection to Sentry

**Test**:
```typescript
import * as Sentry from '@sentry/nextjs';
Sentry.captureException(new Error('Test error'));
```

### Issue: Too Many Errors

**Solution**:
1. Filter by severity (ignore info/debug)
2. Group similar errors
3. Set up sampling (only send 10% of errors)

**Configure**:
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sampleRate: 0.1, // Only send 10% of errors
  tracesSampleRate: 0.1, // Only send 10% of performance data
});
```

### Issue: Sensitive Data in Errors

**Solution**:
1. Use `beforeSend` to filter data
2. Remove sensitive fields

**Configure**:
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Remove sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    return event;
  },
});
```

---

## Sentry Pricing

### Free Tier

- 5,000 errors/month
- 10,000 performance transactions/month
- 1 project
- 7-day data retention

**Good for**: Small projects, development

### Team Tier ($26/month)

- 50,000 errors/month
- 100,000 performance transactions/month
- Unlimited projects
- 90-day data retention
- Email support

**Good for**: Small teams, production apps

### Business Tier ($80/month)

- 100,000 errors/month
- 500,000 performance transactions/month
- Unlimited projects
- 90-day data retention
- Priority support
- Advanced features

**Good for**: Growing companies

---

## Summary

### What Sentry Gives You

1. ✅ **Automatic error capture** - No manual logging
2. ✅ **Full context** - Stack traces, user info, request data
3. ✅ **Error grouping** - Similar errors grouped together
4. ✅ **Performance monitoring** - Track slow operations
5. ✅ **Alerts** - Get notified of critical errors
6. ✅ **Trends** - See error patterns over time
7. ✅ **Professional tool** - Used by top companies

### How to Use It

1. **Daily**: Check dashboard for new issues
2. **Weekly**: Review error trends
3. **Monthly**: Analyze performance data
4. **Always**: Fix critical errors immediately

### Integration with Your System

Your app now has **two monitoring systems**:

1. **Your Dashboard** (`/dashboard/monitoring`)
   - Real-time stats
   - Quick overview
   - Custom metrics

2. **Sentry Dashboard** (https://sentry.io)
   - Detailed errors
   - Stack traces
   - Performance monitoring

**Use both for complete visibility!**

---

## Quick Reference

### Sentry Dashboard URL
https://sentry.io

### Your Monitoring Dashboard URL
http://localhost:3000/dashboard/monitoring

### Test Sentry
```typescript
import * as Sentry from '@sentry/nextjs';
Sentry.captureException(new Error('Test error'));
```

### Check Sentry Status
```bash
echo $NEXT_PUBLIC_SENTRY_DSN
```

### Sentry Documentation
https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

**Your monitoring system is complete!** 🎉

Use Sentry for detailed error analysis and your dashboard for real-time monitoring.

