# Complete Checklist: Make Dashboard Fully Dynamic for Client Users

This document summarizes all SQL migrations you need to apply to make the dashboard fully functional for client users.

---

## Quick Summary

Your dashboard has several features that were **owner-only** due to missing RLS (Row Level Security) policies. We've created fixes for all of them.

### What's Already Dynamic ✅
- Movements
- Prospects  
- Staff (list)
- Branches (list)
- B2B Referrals summary cards
- Health & Safety summary cards

### What Needs RLS Policies ❌
1. B2B Companies & Referrals (403 error)
2. Health & Safety Items (403 error)
3. Staff League Table (needs database view)

---

## Apply These Migrations in Order

### 1. B2B Referrals - Client Permissions ✅

**File**: `supabase/migrations/add_client_b2b_policies.sql`  
**Instructions**: `APPLY_B2B_FIX.md`

**Why**: Allows clients to create/manage B2B companies and referrals

**SQL**: Copy from `APPLY_B2B_FIX.md` lines 20-95

---

### 2. Health & Safety - Client Permissions ✅

**File**: `supabase/migrations/add_client_health_safety_policies.sql`  
**Instructions**: `HEALTH_SAFETY_FIX.md`

**Why**: Allows clients to create/manage health & safety items and incident reports

**SQL**: Copy from `HEALTH_SAFETY_FIX.md` lines 27-102

---

### 3. Staff League Table - Performance Metrics View ✅

**File**: `supabase/migrations/staff_performance_metrics.sql`  
**Instructions**: `STAFF_LEAGUE_TABLE_FIX.md`

**Why**: Calculates staff performance from movements data for the league table

**SQL**: Copy from `STAFF_LEAGUE_TABLE_FIX.md` lines 20-66

---

## How to Apply All Migrations

### Option 1: One by One (Recommended)

1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr/sql
2. For each migration above:
   - Click **"New Query"**
   - Copy the SQL from the file
   - Paste and click **"Run"**
   - Verify: `Success. No rows returned`

### Option 2: All at Once

Copy all three SQL blocks into a single query:

```sql
-- 1. B2B Client Policies
[paste SQL from APPLY_B2B_FIX.md]

-- 2. Health & Safety Client Policies  
[paste SQL from HEALTH_SAFETY_FIX.md]

-- 3. Staff Performance View
[paste SQL from STAFF_LEAGUE_TABLE_FIX.md]
```

Then click **"Run"** once.

---

## After Applying Migrations

1. **Hard refresh your browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. Test each feature:
   - ✅ Create a B2B company
   - ✅ Add a referral to a B2B company
   - ✅ Report a health & safety incident
   - ✅ View Staff League Table with real data

---

## What Each Feature Needs to Show Dynamic Data

### B2B Referrals Cards
- **Active Partners**: Create B2B companies
- **Total Referrals**: Add referrals to companies
- **Total Commission**: Mark referrals as "Completed"
- **Mortgage/Legal/AML counts**: Create companies of those types

### Health & Safety Cards
- **Compliant**: Create items with status "compliant"
- **Pending**: Create items with status "pending"  
- **Overdue**: Create items with status "overdue" and past due date

### Staff League Table
- **Requires**:
  - Staff members in `staff_members` table
  - Movements in `movements` table
  - Movements must have `agent` field matching staff names
  - Movements must have status `completed`/`exchanged`/`sale` for closed deals

---

## Verification Checklist

After applying all migrations and refreshing:

- [ ] Can create B2B companies without 403 error
- [ ] Can add referrals to B2B companies
- [ ] B2B summary cards show correct counts
- [ ] Can report health & safety incidents without error
- [ ] Health & Safety cards show correct counts
- [ ] Staff League Table loads (check console for debug logs)
- [ ] Staff League Table shows real data when staff have completed movements

---

## Need Help?

If you encounter any issues:
1. Check browser console for error messages
2. Check Supabase logs for RLS policy denials
3. Verify your user email matches a client record in the database
