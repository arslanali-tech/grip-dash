# Branch Manager Setup Guide

## Overview
Branch managers can now perform full operations in their dashboard, including creating staff, managing their branch, and viewing branch-specific data.

## How It Works

### 1. Creating a Branch Manager

**From Client Dashboard (Staff Tab):**
1. Navigate to Business Manager → Staff
2. Click "Add Staff Member"
3. Fill in details:
   - Name, Email, Phone
   - Role: **Manager** (this will be stored as `branch_manager`)
   - Branch: Select the branch they will manage
4. Click "Add Staff Member"

This will:
- Create a record in `client_staff` table with `role='branch_manager'` and `branch_id`
- Send an invitation email with a password reset link
- Store invitation metadata including `client_id`, `branch_id`, `branch`, and `name`

### 2. Branch Manager First Login

**Reset Password Flow:**
1. Branch manager receives email with reset password link
2. Click link → redirected to `/reset-password`
3. Set password (min 6 characters)
4. Click "Update password" → redirected to login

**On First Login:**
- The `syncPendingInvitationForUser` function automatically:
  - Looks up pending invitation by email
  - Syncs role and metadata to user profile
  - Marks invitation as accepted
- User metadata will contain:
  ```json
  {
    "role": "branch_manager",
    "name": "John Smith",
    "branch": "Central London",
    "client_id": "uuid-of-client",
    "branch_id": "uuid-of-branch"
  }
  ```

### 3. Branch Manager Dashboard

**Navigation:**
After login, branch manager sees:
- Movements
- Diary
- Prospecting
- Branch Analytics
- **Branch Management** ← Main section for operations
- Referrals
- The Hub
- Team Chat
- Genius

**Branch Management Section:**
Includes tabs:
- **Business Management** (P&L, finances)
- **Company Flow** (org chart)
- **Staff** ← Create and manage staff here
- **B2B Referrals**
- **Health & Safety**
- **House Keeping**

### 4. Creating Staff as Branch Manager

**From Branch Management → Staff:**
1. Click "Add Staff Member"
2. Fill in:
   - Name, Email, Phone
   - Role: **Negotiator** or **Prospector** (Manager option hidden for branch managers)
   - Branch: Pre-selected to branch manager's branch
3. Click "Add Staff Member"

This will:
- Create record in `client_staff` with `branch_id` matching the branch manager's branch
- Send invitation email to new staff
- Store metadata: `{name, role, branch, client_id, branch_id}`
- New staff visible only to:
  - The branch manager who created them
  - The client (owner of the estate agency)
  - GRIP owner

### 5. Staff First Login

**For Negotiators/Prospectors:**
1. Receive email → reset password → set password → login
2. Redirected to their role-specific dashboard:
   - **Negotiators**: NegotiatorDashboard
   - **Prospectors**: ProspectorDashboard
3. See only data relevant to their branch

## Database Schema

### client_staff table
```sql
CREATE TABLE client_staff (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES clients(id),
  branch_id uuid REFERENCES client_branches(id),
  name text,
  email text,
  role text, -- 'branch_manager' | 'negotiator' | 'prospector'
  enabled_modules jsonb,
  created_at timestamptz
);
```

### invitations table
```sql
CREATE TABLE invitations (
  id uuid PRIMARY KEY,
  email text,
  role text,
  agency_id uuid REFERENCES agencies(id),
  status text, -- 'pending' | 'accepted'
  metadata jsonb, -- Contains: {name, branch, client_id, branch_id}
  last_sent_at timestamptz,
  sent_count integer,
  accepted_at timestamptz,
  accepted_user_id uuid,
  created_at timestamptz,
  expires_at timestamptz
);
```

## Visibility & Permissions

### Branch Manager Can See:
- ✅ All staff assigned to their branch (any role)
- ✅ Staff they created
- ✅ Staff created by the client for their branch
- ❌ Staff from other branches
- ❌ Data from other branches

### Client Can See:
- ✅ All staff across all branches
- ✅ All branch managers
- ✅ Performance metrics per branch

### GRIP Owner Can See:
- ✅ Everything across all clients and agencies

## Key Files

### Components
- `src/components/BranchManagerDashboard.tsx` - Main dashboard
- `src/components/views/BusinessManagerView.tsx` - Branch management sections
- `src/components/views/StaffView.tsx` - Staff list & operations
- `src/components/AddStaffDialog.tsx` - Create staff dialog
- `src/components/ResetPasswordScreen.tsx` - Password setup

### API & Logic
- `src/lib/ownerApi.ts` - Database operations (createClientStaff, inviteUserByEmail)
- `src/lib/invitations.ts` - Invitation syncing (syncPendingInvitationForUser)
- `src/lib/dashboardApi.ts` - Context resolution (resolveClientIdForUser)
- `src/stores/branchManagerStore.ts` - Branch manager state

## Testing the Flow

### 1. Setup Test Client
```sql
-- Ensure you have a client with branches
INSERT INTO clients (id, agency_id, name, email) VALUES 
  ('client-uuid', 'agency-uuid', 'Test Estate Agency', 'agency@test.com');

INSERT INTO client_branches (id, client_id, name) VALUES
  ('branch-uuid', 'client-uuid', 'Central London');
```

### 2. Create Branch Manager
1. Login as client (agency@test.com)
2. Navigate to Business Manager → Staff
3. Add staff: name="John Manager", email="manager@test.com", role="Manager", branch="Central London"
4. Check email for invitation link

### 3. Branch Manager Login
1. Click link from email
2. Set password: "test123"
3. Login with manager@test.com / test123
4. Verify: Should see Branch Manager Dashboard

### 4. Create Staff as Branch Manager
1. Navigate to Branch Management → Staff
2. Add staff: name="Jane Negotiator", email="negotiator@test.com", role="Negotiator"
3. Check: Staff list should show Jane
4. Check email: Jane should receive invitation

### 5. Verify Data Scoping
```sql
-- Should see staff only for branch-uuid
SELECT * FROM client_staff 
WHERE branch_id = 'branch-uuid';

-- Should see invitation with correct metadata
SELECT email, role, metadata 
FROM invitations 
WHERE email = 'negotiator@test.com';
```

## Troubleshooting

### Branch Manager Can't See Staff Tab
- **Check:** `user.user_metadata.role` is `'branch_manager'`
- **Fix:** Resend invitation or manually update: `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "branch_manager"}'::jsonb WHERE email = 'manager@test.com';`

### Staff Not Scoped to Branch
- **Check:** `client_staff.branch_id` matches branch manager's `user.user_metadata.branch_id`
- **Check:** StaffView receives `branchName` prop
- **Check:** effectiveClientId is resolved correctly

### Invitation Email Not Received
- **Check:** Supabase email settings configured
- **Check:** `invitations` table has record with `status='pending'`
- **Try:** Use magic link as fallback: "Sign in via OTP / magic link" on login screen

### Reset Password Link Invalid
- **Check:** Link hasn't expired (7 days default)
- **Check:** Using correct Supabase project
- **Try:** Resend invitation from client dashboard

## Future Enhancements

1. **Branch Manager Permissions:**
   - Edit branch details (address, phone)
   - View branch performance metrics
   - Approve/reject staff requests

2. **Staff Self-Management:**
   - Update own profile
   - Request time off
   - View personal performance

3. **Enhanced Notifications:**
   - Email reminders for incomplete invitations
   - Slack/SMS integration
   - In-app notifications for new staff

4. **Bulk Operations:**
   - Import staff from CSV
   - Bulk role assignments
   - Mass email invitations
