import React, { useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { DashboardContent } from './components/DashboardContent';
import { BranchManagerDashboard } from './components/BranchManagerDashboard';
import { NegotiatorDashboard } from './components/NegotiatorDashboard';
import { ProspectorDashboard } from './components/ProspectorDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { LoginScreen } from './components/LoginScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { useDashboardStore } from './stores/dashboardStore';
import { useBranchManagerStore } from './stores/branchManagerStore';
import { useNegotiatorStore } from './stores/negotiatorStore';
import { useProspectorStore } from './stores/prospectorStore';
import { useIsMobile } from './hooks/use-mobile';
import { useOwnerStore } from './stores/ownerStore';
import { useNotesStore } from './stores/notesStore';
import { MobileNavBar } from './components/MobileNavBar';
import { cn } from './lib/utils';
import { useAuthStore } from './stores/authStore';
import { resolveIsGripOwner, getUserRole } from './lib/ownerAccess';
import { syncPendingInvitationForUser } from './lib/invitations';
import { resolveAgencyIdForUser, resolveClientIdForUser } from './lib/dashboardApi';
import { resolveUserEnabledModules } from './lib/userModules';
import { fetchFranchiseClientsForClient } from './lib/ownerApi';

function App() {
  const pathname = window.location.pathname;

  // Dedicated route for Supabase password recovery
  if (pathname === '/reset-password') {
    return <ResetPasswordScreen />;
  }

  const { status, user, init } = useAuthStore();
  const isMobile = useIsMobile();
  const { currentView, setAgencyId, setClientId, setClientScopeIds, setFranchiseClients, loadMovements, loadProspects, loadStaffMembers, setUserEnabledModules, agencyId } = useDashboardStore();
  const { isOpen: isOwnerDashboardOpen } = useOwnerStore();
  const { selectedStaffMember: selectedBranchManager } = useBranchManagerStore();
  const { selectedStaffMember: selectedNegotiator } = useNegotiatorStore();
  const { selectedStaffMember: selectedProspector } = useProspectorStore();
  const { setUserContext } = useNotesStore();

  const [ownerCheck, setOwnerCheck] = useState<{ status: 'idle' | 'loading' | 'done'; isOwner: boolean }>(
    { status: 'idle', isOwner: false }
  );

  useEffect(() => {
    void init();
  }, [init]);

  const isAuthenticated = status === 'authenticated' && !!user;
  const invitationSyncUserIdRef = useRef<string | null>(null);

  // On first sign-in, sync pending invitation (role/metadata) into user profile.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (invitationSyncUserIdRef.current === user.id) return;

    invitationSyncUserIdRef.current = user.id;
    void syncPendingInvitationForUser(user);
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!isAuthenticated || !user) {
        setOwnerCheck({ status: 'idle', isOwner: false });
        return;
      }

      setOwnerCheck({ status: 'loading', isOwner: false });
      const isOwner = await resolveIsGripOwner(user);
      if (!cancelled) {
        setOwnerCheck({ status: 'done', isOwner });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // Load agency data and user-specific enabled modules for non-owner users
  useEffect(() => {
    if (!isAuthenticated || ownerCheck.isOwner || !user) return;
    let cancelled = false;

    const run = async () => {
      const resolved = await resolveAgencyIdForUser(user);
      if (!resolved || cancelled) return;
      setAgencyId(resolved);
      setClientId(null);
      setClientScopeIds(null);
      setFranchiseClients([]);

      // Try to resolve clientId for client users (from metadata or email)
      // This is crucial for data isolation - clients should only see their own data
      let resolvedClient: string | null = null;
      let resolvedClientScope: string[] = [];
      let resolvedFranchiseClients: { id: string; name: string; franchise_super_user_access: boolean | null; franchise_group_id: string | null }[] = [];
      try {
        resolvedClient = await resolveClientIdForUser(user);
        if (resolvedClient && !cancelled) {
          setClientId(resolvedClient);
          const franchiseClients = await fetchFranchiseClientsForClient(resolvedClient);
          resolvedFranchiseClients = franchiseClients;
          resolvedClientScope = franchiseClients.length > 0
            ? franchiseClients.map((client) => client.id)
            : [resolvedClient];
          setClientScopeIds(resolvedClientScope);
          setFranchiseClients(resolvedFranchiseClients);
        }
      } catch (e) {
        console.warn('Could not resolve client id for user', e);
      }

      if (cancelled) return;

      if (!resolvedClient && !cancelled) {
        setClientId(null);
        setClientScopeIds(null);
        setFranchiseClients([]);
      }

      // Initialize notes store with user context for ThinkPad persistence
      setUserContext(user.id, resolved);

      // Load user-specific enabled modules from database
      const moduleConfig = await resolveUserEnabledModules(user);
      if (!cancelled && moduleConfig) {
        setUserEnabledModules(moduleConfig.enabledModules);
      }
      
      // Pass clientId to load functions for proper data isolation
      // If clientId is set, only that client's data will be loaded
      await Promise.all([
        loadMovements(resolved, resolvedClientScope.length > 0 ? resolvedClientScope : resolvedClient ?? undefined),
        loadProspects(resolved, resolvedClientScope.length > 0 ? resolvedClientScope : resolvedClient ?? undefined),
        loadStaffMembers(resolved, resolvedClientScope.length > 0 ? resolvedClientScope : resolvedClient ?? undefined)
      ]);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ownerCheck.isOwner, user?.id, loadMovements, loadProspects, setAgencyId, setUserEnabledModules]);

  // When returning to the Owner dashboard (isOpen=true), drop any impersonated client context.
  useEffect(() => {
    if (ownerCheck.isOwner && isOwnerDashboardOpen) {
      setClientId(null);
      setClientScopeIds(null);
      setFranchiseClients([]);
      setUserEnabledModules(null); // Clear user-specific module restrictions
    }
  }, [ownerCheck.isOwner, isOwnerDashboardOpen, setClientId, setClientScopeIds, setFranchiseClients, setUserEnabledModules]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <span>Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const ownerCheckPending = isAuthenticated && ownerCheck.status !== 'done';
  if (ownerCheckPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <span>Checking access…</span>
      </div>
    );
  }

  if (ownerCheck.isOwner) {
    // Owner drill-in / impersonation: when a staff member is selected, show their dashboard
    // without changing the authenticated user's role.
    if (selectedBranchManager) {
      return <BranchManagerDashboard />;
    }

    if (selectedNegotiator) {
      return <NegotiatorDashboard />;
    }

    if (selectedProspector) {
      return <ProspectorDashboard />;
    }

    // When the Owner dashboard is "closed" (isOpen=false), fall back to the
    // main client dashboard view, scoped by the current agencyId in
    // useDashboardStore. This is used by the "Login as {client}" action.
    if (!isOwnerDashboardOpen) {
      return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
          <TopBar />

          <main className={cn('flex-1 overflow-y-auto', isMobile ? 'pb-16' : '')}>
            <DashboardContent view={currentView} />
          </main>

          {isMobile && <MobileNavBar />}
        </div>
      );
    }

    return <OwnerDashboard />;
  }

  // Role-based routing for non-owner users
  const role = (getUserRole(user) ?? '').trim().toLowerCase();
  console.log('[App] User role from metadata:', getUserRole(user), '-> normalized:', role);

  if (role === 'branch_manager') {
    return <BranchManagerDashboard />;
  }

  if (role === 'negotiator') {
    return <NegotiatorDashboard />;
  }

  if (role === 'prospector') {
    return <ProspectorDashboard />;
  }

  // Client/agency users get the main dashboard with role-based tab filtering
  if (role === 'client' || role === 'agency_user') {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <TopBar />

        <main className={cn('flex-1 overflow-y-auto', isMobile ? 'pb-16' : '')}>
          <DashboardContent view={currentView} />
        </main>

        {isMobile && <MobileNavBar />}
      </div>
    );
  }

  if (selectedBranchManager) {
    return <BranchManagerDashboard />;
  }

  if (selectedNegotiator) {
    return <NegotiatorDashboard />;
  }

  if (selectedProspector) {
    return <ProspectorDashboard />;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <TopBar />

      <main className={cn('flex-1 overflow-y-auto', isMobile ? 'pb-16' : '')}>
        <DashboardContent view={currentView} />
      </main>

      {isMobile && <MobileNavBar />}
    </div>
  );
}

export default App;
