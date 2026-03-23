import React from 'react';
import { MovementsView } from './views/MovementsView';
import { OverviewView } from './views/OverviewView';
import { BranchesView } from './views/BranchesView';
import { StaffView } from './views/StaffView';
import { TasksView } from './views/TasksView';
import { ProspectingView } from './views/ProspectingView';
import { BusinessAnalyticsView } from './views/BusinessAnalyticsView';
import { BusinessManagerView } from './views/BusinessManagerView';
import { MyAnalyticsView } from './views/MyAnalyticsView';
import { ProspectingAnalyticsView } from './views/ProspectingAnalyticsView';
import { ComingSoonView } from './views/ComingSoonView';
import { ReferralPropertyView } from './views/ReferralPropertyView';
import { BranchLeagueTableView } from './views/BranchLeagueTableView';
import { HouseKeepingView } from './views/HouseKeepingView';
import { BaseCampView } from './views/BaseCampView';
import { ProspectorDashboard } from './ProspectorDashboard';
import { StationeryRequestDialog } from './StationeryRequestDialog';
import { InvoiceGeneratorDialog } from './InvoiceGeneratorDialog';
import { InvoiceTemplateView } from './views/InvoiceTemplateView';
import { ComplianceDocumentsView } from './views/ComplianceDocumentsView';
import { ComplianceTasksList } from './ComplianceTasksList';
import { GeniusView } from './views/GeniusView';
import { DataUploadView } from './views/DataUploadView';
import { LeadGenUploadView } from './views/LeadGenUploadView';
import { SettingsView } from './views/SettingsView';
import { WeeklySnapshotView } from './views/WeeklySnapshotView';
import { TeamChatView } from './views/TeamChatView';

import { ViewType, useDashboardStore } from '@/stores/dashboardStore';

interface DashboardContentProps {
  view: ViewType;
}

export function DashboardContent({ view }: DashboardContentProps) {
  const { agencyId } = useDashboardStore();

  switch (view) {
    case 'overview':
      return <OverviewView />;
    case 'movements':
      return <MovementsView />;
    case 'branches':
      return <BranchesView agencyId={agencyId ?? undefined} />;
    case 'staff':
      return <StaffView agencyId={agencyId ?? undefined} />;
    case 'tasks':
      return <TasksView />;
    case 'team-chat':
      return <TeamChatView agencyId={agencyId ?? undefined} />;
    case 'prospecting':
      return <ProspectingView />;
    case 'business-analytics':
      return <BusinessAnalyticsView />;
    case 'business-manager':
      return <BusinessManagerView agencyId={agencyId ?? undefined} />;
    case 'branch-league-table':
      return <BranchLeagueTableView />;
    case 'my-analytics':
      return <MyAnalyticsView />;
    case 'prospecting-analytics':
      return <ProspectingAnalyticsView />;
    case 'grip-dash':
      // Owner dashboard is gated at the App level. Keep this route non-privileged.
      return <ComingSoonView view={view} />;
    case 'genius':
      return <GeniusView />;
    case 'genius-performance-calculator':
      return <GeniusView />;
    case 'genius-calendar':
      return <GeniusView />;
    case 'genius-kpis':
      return <GeniusView />;
    case 'genius-staff-kpis':
      return <ComingSoonView view="staff-kpis" />;
    case 'genius-branch-kpis':
      return <GeniusView />;
    case 'genius-weekly-snapshot':
      return <GeniusView />;
    case 'genius-branch-performance-summary':
      return <GeniusView />;
    case 'genius-staff-performance-summary':
      return <GeniusView />;
    case 'genius-set-targets':
      return <GeniusView />;
    case 'base-camp':
      return <BaseCampView />;
    case 'prospector-dash':
      return <ProspectorDashboard />;
    case 'stationery-request':
      return <StationeryRequestDialog open={true} onOpenChange={() => {}} onSave={() => {}} />;
    case 'invoice-generator':
      return <InvoiceGeneratorDialog open={true} onOpenChange={() => {}} onGenerate={() => {}} agencyId={agencyId} />;
    case 'invoice-template':
      return <InvoiceTemplateView />;
    case 'compliance-documents':
      return <ComplianceDocumentsView />;
    case 'compliance-tasks-list':
      return <ComplianceTasksList />;
    case 'data-upload':
      return <DataUploadView />;
    case 'lead-gen-upload':
      return <LeadGenUploadView />;
    case 'settings':
      return <SettingsView />;
    case 'buyers-sellers':
      return <ReferralPropertyView agencyId={agencyId ?? undefined} />;
    case 'house-keeping':
      return <ComingSoonView view={view} />;
    default:
      return <MovementsView />;
  }
}
