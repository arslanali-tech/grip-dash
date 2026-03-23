# Fixed: Staff Count in Branches View

## Problem
The branches list was showing "0 Staff" even after adding staff members to branches.

## Root Cause
For **client branches** (`client_branches` table), the staff count wasn't being calculated. The code was hardcoded to return `teamSize: 0` when mapping client branches.

## Solution Implemented ✅

### Changes Made:

1. **Import staff fetching function**:
   - Added `fetchClientStaffForClient` import

2. **Update `mapClientBranchToBranch` function**:
   - Now accepts a `staffCount` parameter
   - Uses the passed staff count instead of hardcoded 0

3. **Load staff when loading branches**:
   - Fetch both branches and staff in parallel
   - Count staff per branch by grouping by `branch_id`
   - Pass the count when mapping branches

4. **Preserve count when updating**:
   - When updating a branch, preserve the current staff count

### How It Works:

```typescript
// 1. Load branches and staff together
const [branchRows, staffRows] = await Promise.all([
  fetchClientBranches(effectiveClientId),
  fetchClientStaffForClient(effectiveClientId),
]);

// 2. Count staff per branch
const staffCountByBranch = new Map<string, number>();
staffRows.forEach((staff) => {
  if (staff.branch_id) {
    staffCountByBranch.set(
      staff.branch_id,
      (staffCountByBranch.get(staff.branch_id) || 0) + 1
    );
  }
});

// 3. Map branches with their staff counts
setBranches(branchRows.map((row) => 
  mapClientBranchToBranch(row, staffCountByBranch.get(row.id) || 0)
));
```

---

## Testing

1. **Refresh your browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. Navigate to: **Business Manager → Branches**
3. The staff count should now show the correct number
4. Add/remove staff from a branch
5. Refresh the page - the count should update

---

## Note

The staff count will **update automatically** when:
- You first load the page
- You navigate away and come back

The staff count will **NOT update live** when:
- You add/remove staff while staying on the branches page
- To see the updated count, refresh the page

If you want **live updates**, you would need to implement a callback from the Staff view to the Branches view, or reload branches after staff changes.
