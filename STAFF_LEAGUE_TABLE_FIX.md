# Make Staff League Table Dynamic

## Problem
The Staff League Table shows mock/hardcoded data instead of real performance metrics from the database.

## Solution
Create a database view that calculates staff performance metrics from movements data, then load it in the UI.

---

## Step 1: Apply SQL Migration

### Option A: Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/grvamqvqhzgsignycrtr/sql
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Create a view to calculate staff performance metrics
-- This aggregates movements data to show deals closed, revenue, avg deal value, conversion rate

create or replace view public.staff_performance_metrics as
select
  sm.id as staff_id,
  sm.name as staff_name,
  sm.role,
  sm.branch_name as branch,
  sm.agency_id,
  
  -- Count completed deals (movements with status 'completed' or 'exchanged')
  count(distinct m.id) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ) as deals_closed,
  
  -- Total revenue from completed deals
  coalesce(sum(m.price) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ), 0) as total_revenue,
  
  -- Average deal value
  coalesce(avg(m.price) filter (
    where m.status in ('completed', 'exchanged', 'sale')
  ), 0) as avg_deal_value,
  
  -- Total movements (for conversion rate calculation)
  count(distinct m.id) as total_movements,
  
  -- Conversion rate (completed deals / total movements)
  case
    when count(distinct m.id) > 0 then
      count(distinct m.id) filter (
        where m.status in ('completed', 'exchanged', 'sale')
      )::numeric / count(distinct m.id)::numeric
    else 0
  end as conversion_rate

from public.staff_members sm
left join public.movements m on lower(m.agent) = lower(sm.name) and m.agency_id = sm.agency_id
group by sm.id, sm.name, sm.role, sm.branch_name, sm.agency_id;

-- Grant select permissions to authenticated users
grant select on public.staff_performance_metrics to authenticated;

-- RLS policy: users can only see metrics for their own agency
alter view public.staff_performance_metrics set (security_invoker = on);
```

4. Click **"Run"**
5. You should see: `Success. No rows returned`

---

## Step 2: Test in Your App

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R / Cmd+Shift+R)
2. Navigate to: **Business Manager → Staff → Staff League Table**
3. Check the browser console for debug logs:
   - `[StaffLeagueTableView] Loading performance metrics for agency: <uuid>`
   - `[StaffLeagueTableView] Loaded X staff performance records`

---

## How It Works

### The View Calculates:
- **Deals Closed**: Count of movements with status `completed`, `exchanged`, or `sale`
- **Total Revenue**: Sum of prices from completed movements
- **Avg Deal Value**: Average price of completed movements
- **Conversion Rate**: Completed deals ÷ Total movements

### Staff are Matched to Movements By:
- Matching `movements.agent` field with `staff_members.name` (case-insensitive)
- Same `agency_id`

### Requirements for Dynamic Data:
1. **Staff members** must exist in `staff_members` table
2. **Movements** must exist in `movements` table
3. **Movements must have**:
   - `agent` field matching a staff member's name
   - `status` field set to `completed`, `exchanged`, or `sale` (for closed deals)
   - `price` field with deal value

---

## Fallback Behavior

If no `agencyId` is provided or the database query fails, the view falls back to mock data for demonstration purposes.

---

## Next Steps: Staff Performance Summary

The **Staff Performance** tab can also be made dynamic using a similar approach. Let me know if you want to make that dynamic as well!
