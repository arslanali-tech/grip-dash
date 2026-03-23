# Debug Steps for "No branches found"

## Problem
After "Login as client", the Branches view shows empty even though client_branches exist in DB.

## Root cause hypothesis
The `clientIdFromStore` or `effectiveClientId` is still null/undefined when BranchesView loads.

## Add console logging to diagnose

In `src/components/views/BranchesView.tsx`, add these logs right after line 102:

```typescript
console.log('[BranchesView] Debug:', {
  userRole,
  isClientUser,
  resolvedClientId,
  clientIdFromStore,
  effectiveClientId,
  agencyIdFromStore,
  resolvedAgencyId,
  shouldUseClientMode,
});
```

Then:
1. Open browser DevTools console
2. Owner dashboard → Clients → Select a client → "Login as {client}"
3. Navigate to Business Manager → Branches
4. Check what the console logs show for `effectiveClientId` and `clientIdFromStore`

If both are null, then the issue is that setClientId() isn't persisting in the store.
