import { type ElementType, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  UsersIcon,
  Building2Icon,
  BriefcaseIcon,
  UserCheckIcon,
  NetworkIcon,
  HomeIcon,
  ShieldCheckIcon,
  SettingsIcon,
  LayoutGridIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfitAndLossView } from './ProfitAndLossView';
import { StaffView } from './StaffView';
import { BranchesView } from './BranchesView';
import { B2BReferralsView } from './B2BReferralsView';
import { HealthSafetyView } from './HealthSafetyView';
import { HouseKeepingView } from './HouseKeepingView';
import { CompanyStructureView } from './CompanyStructureView';
import { RoleConfigurationView } from './RoleConfigurationView';
import { ModuleConfigurationView } from './ModuleConfigurationView';
import { useBranchManagerStore } from '@/stores/branchManagerStore';
import { AgencyBusinessSectionRow, ensureDefaultBusinessSections } from '@/lib/ownerApi';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { useBusinessConfigStore } from '@/stores/businessConfigStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { resolveAgencyIdForUser } from '@/lib/dashboardApi';

type BusinessManagerSection = 'business-management' | 'company-flow' | 'branches' | 'staff' | 'b2b-referrals' | 'health-safety' | 'house-keeping' | 'role-configuration' | 'module-configuration' | null;

interface BusinessManagerViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
}

export function BusinessManagerView({ agencyId, branchId, branchName }: BusinessManagerViewProps) {
  const [activeSection, setActiveSection] = useState<BusinessManagerSection>('business-management');
  const [dynamicSections, setDynamicSections] = useState<AgencyBusinessSectionRow[] | null>(null);
  const [resolvedAgencyId, setResolvedAgencyId] = useState<string | null>(null);
  const { selectedStaffMember } = useBranchManagerStore();
  const { user } = useAuthStore();
  const { isSectionEnabledForRole } = useBusinessConfigStore();
  const { agencyId: agencyIdFromStore } = useDashboardStore();

  const authRole = getUserRole(user);
  const canLoadDynamicSections = authRole === 'owner' || authRole === 'admin';
  const isBranchManagerUser = authRole === 'branch_manager';

  // Branch-manager mode is either:
  // - Owner drill-in (selectedStaffMember set), or
  // - A real authenticated branch_manager user.
  const isBranchManager = !!selectedStaffMember || isBranchManagerUser;
  const userBranch =
    branchName ??
    selectedStaffMember?.branch ??
    ((user?.user_metadata as any)?.branch as string | undefined);

  // IMPORTANT: Ensure an agency context is resolved for Business Manager data tables.
  const effectiveAgencyId = agencyId ?? agencyIdFromStore ?? resolvedAgencyId ?? undefined;

  useEffect(() => {
    if (agencyId) {
      setResolvedAgencyId(agencyId);
      return;
    }
    if (agencyIdFromStore) {
      setResolvedAgencyId(agencyIdFromStore);
      return;
    }
    if (!user) return;

    let cancelled = false;
    const run = async () => {
      const resolved = await resolveAgencyIdForUser(user);
      if (!cancelled) {
        setResolvedAgencyId(resolved);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [agencyId, agencyIdFromStore, user?.id]);

  // Default static sections (used for branch managers and as fallback)
  const defaultSections: { id: BusinessManagerSection; title: string; icon: ElementType }[] = [
    {
      id: 'business-management',
      title: isBranchManager ? 'Branch Management' : 'Business Management',
      icon: BriefcaseIcon,
    },
    {
      id: 'company-flow',
      title: isBranchManager ? 'Branch Flow' : 'Company Flow',
      icon: NetworkIcon,
    },
    {
      id: 'branches',
      title: 'Branches',
      icon: Building2Icon,
    },
    {
      id: 'staff',
      title: 'Staff',
      icon: UsersIcon,
    },
    {
      id: 'b2b-referrals',
      title: 'B2B Referrals',
      icon: UserCheckIcon,
    },
    {
      id: 'health-safety',
      title: 'Health & Safety',
      icon: ShieldCheckIcon,
    },
    {
      id: 'house-keeping',
      title: 'House Keeping',
      icon: HomeIcon,
    },
    {
      id: 'role-configuration',
      title: 'Role Configuration',
      icon: ShieldCheckIcon,
    },
    {
      id: 'module-configuration',
      title: 'Module Configuration',
      icon: LayoutGridIcon,
    },
  ];

  // Load dynamic sections from database
  useEffect(() => {
    const loadSections = async () => {
      if (!effectiveAgencyId) {
        setDynamicSections(null);
        return;
      }
      if (!canLoadDynamicSections) {
        setDynamicSections(null);
        return;
      }

      try {
        const rows = await ensureDefaultBusinessSections(effectiveAgencyId);
        setDynamicSections(rows);
      } catch (error) {
        console.warn('Could not load business sections from database (permission may be restricted)', error);
        setDynamicSections([]);
      }
    };

    void loadSections();
  }, [effectiveAgencyId, canLoadDynamicSections]);

  const mappedSections = useMemo(
    () => {
      // If dynamic sections loaded from database, use them
      if (dynamicSections && dynamicSections.length > 0) {
        const enabledSections = dynamicSections
          .filter((s) => s.is_enabled)
          .map((s) => {
            const base = defaultSections.find((d) => d.id === (s.key as BusinessManagerSection));
            // Apply branch manager label adjustments if needed
            let title = s.label;
            if (isBranchManager) {
              if (s.key === 'business-management') title = 'Branch Management';
              if (s.key === 'company-flow') title = 'Branch Flow';
            }
            return {
              id: s.key as BusinessManagerSection,
              title,
              icon: base?.icon ?? BriefcaseIcon,
            };
          });
        // If no sections are enabled, fall back to defaults
        return enabledSections.length > 0 ? enabledSections : defaultSections;
      }
      // Otherwise use default sections
      return defaultSections;
    },
    [dynamicSections, isBranchManager]
  );

  const sections = useMemo(
    () => mappedSections.filter((section) => {
      // Hide branches for branch managers
      if (isBranchManager && section.id === 'branches') return false;
      // Hide role/module config for non-owners/non-admins
      if (['role-configuration', 'module-configuration'].includes(section.id as string)) {
        const userRole = getUserRole(user);
        if (userRole !== 'owner' && userRole !== 'admin') return false;
      }
      return true;
    }),
    [mappedSections, isBranchManager, user]
  );

  // If the active section was disabled/removed in the DB, fall back to the first available section.
  useEffect(() => {
    if (!activeSection || sections.length === 0) return;
    const exists = sections.some((s) => s.id === activeSection);
    if (!exists) {
      setActiveSection(sections[0].id);
    }
  }, [activeSection, sections]);

  const renderContent = () => {
    switch (activeSection) {
      case 'business-management':
        return (
          <ProfitAndLossView
            agencyId={effectiveAgencyId}
            branchName={isBranchManager ? userBranch : undefined}
          />
        );
      case 'company-flow':
        return (
          <CompanyStructureView
            agencyId={effectiveAgencyId}
            title={isBranchManager ? 'Branch Flow' : 'Company Flow'}
            branchName={isBranchManager ? userBranch : undefined}
          />
        );
      case 'branches':
        return <BranchesView agencyId={effectiveAgencyId} />;
      case 'staff':
        return <StaffView branchName={isBranchManager ? userBranch : undefined} agencyId={effectiveAgencyId} />;
      case 'b2b-referrals':
        return <B2BReferralsView agencyId={effectiveAgencyId} branchId={isBranchManager ? branchId : undefined} />;
      case 'health-safety':
        return <HealthSafetyView agencyId={effectiveAgencyId} branchId={isBranchManager ? branchId : undefined} branchName={isBranchManager ? userBranch : undefined} />;
      case 'house-keeping':
        return <HouseKeepingView agencyId={effectiveAgencyId} branchId={isBranchManager ? branchId : undefined} branchName={isBranchManager ? userBranch : undefined} />;
      case 'role-configuration':
        return <RoleConfigurationView agencyId={effectiveAgencyId} />;
      case 'module-configuration':
        return <ModuleConfigurationView agencyId={effectiveAgencyId} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sub-menu */}
      <div className="border-b border-border bg-card px-4 md:px-6 py-4">
        <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto scrollbar-hide">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <Button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                variant="outline"
                size="sm"
                className={cn(
                  'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all border shrink-0 whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary bg-transparent shadow-sm'
                    : 'border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                <span>{section.title}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className={cn(
        "flex-1",
        (activeSection === 'business-management' || activeSection === 'company-flow') 
          ? "overflow-hidden" 
          : "overflow-y-auto"
      )}>
        {renderContent()}
      </div>
    </div>
  );
}
