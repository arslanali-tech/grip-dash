import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheckIcon, FileTextIcon, UploadCloudIcon, CalendarCheckIcon, CalendarXIcon, PrinterIcon, DollarSignIcon, LayoutTemplateIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HolidayRequestDialog } from '../HolidayRequestDialog';
import { AbsenceBookingDialog } from '../AbsenceBookingDialog';
import { StationeryRequestDialog } from '../StationeryRequestDialog';
import { InvoiceGeneratorDialog } from '../InvoiceGeneratorDialog';
import { MileageHistoryDialog } from '../MileageHistoryDialog';
import { DateRange } from 'react-day-picker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useOwnerStore, OwnerViewType } from '@/stores/ownerStore';
import { useBranchManagerStore } from '@/stores/branchManagerStore';
import { useNegotiatorStore } from '@/stores/negotiatorStore';
import { StaffAppraisalDialog } from '../StaffAppraisalDialog';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format, parseISO, subMonths, getMonth, getYear } from 'date-fns';
import {
  createHousekeepingRequest,
  fetchLatestStaffAppraisal,
  type StaffAppraisalRequestRow,
  updateHousekeepingRequest,
} from '@/lib/housekeepingApi';
import { notifyRoles } from '@/lib/notificationsApi';
import { notifySuccess, notifyError } from '@/lib/notify';
import { useAuthStore } from '@/stores/authStore';
import {
  DEFAULT_HOUSEKEEPING_VISIBILITY,
  fetchProspectorDashboardConfigByEmail,
  fetchProspectorDashboardConfigByStaffId,
  type HousekeepingItemId,
} from '@/lib/prospectorDashboardConfig';

interface HouseKeepingViewProps {
  agencyId?: string;
  branchId?: string;
  branchName?: string;
  visibleItems?: Partial<Record<HousekeepingItemId, boolean>>;
}

export function HouseKeepingView({
  agencyId: agencyIdProp,
  branchId: branchIdProp,
  branchName: branchNameProp,
  visibleItems,
}: HouseKeepingViewProps = {}) {
  const { movements, agencyId: storeAgencyId, clientId, staffMembers, loadStaffMembers } = useDashboardStore();
  const agencyId = agencyIdProp ?? storeAgencyId ?? undefined;
  const user = useAuthStore((s) => s.user);
  const currentUserName =
    (user?.user_metadata as any)?.name ??
    (user?.user_metadata as any)?.full_name ??
    (user?.app_metadata as any)?.name ??
    user?.email ??
    'Unknown';
  const effectiveBranchId =
    branchIdProp ??
    ((user?.user_metadata as any)?.branch_id as string | undefined) ??
    ((user?.app_metadata as any)?.branch_id as string | undefined) ??
    null;
  const effectiveBranchName =
    branchNameProp ??
    ((user?.user_metadata as any)?.branch as string | undefined) ??
    ((user?.app_metadata as any)?.branch as string | undefined);
  
  // Compute commission data from movements
  const commissionData = useMemo(() => {
    const now = new Date();
    const monthlyCommission: Record<string, number> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const key = format(monthDate, 'MMM');
      monthlyCommission[key] = 0;
    }
    
    // Aggregate fee amounts by month
    movements.forEach(m => {
      if (!m.date) return;
      const date = parseISO(m.date);
      const monthKey = format(date, 'MMM');
      const monthsAgo = (getYear(now) - getYear(date)) * 12 + (getMonth(now) - getMonth(date));
      
      if (monthsAgo >= 0 && monthsAgo < 6 && monthlyCommission[monthKey] !== undefined) {
        monthlyCommission[monthKey] += m.feeAmount ?? 0;
      }
    });
    
    return Object.entries(monthlyCommission).map(([month, commission]) => ({
      month,
      commission,
    }));
  }, [movements]);
  const { setCurrentView: setOwnerCurrentView } = useOwnerStore(); // For Owner Dashboard navigation
  const { setCurrentView: setBranchManagerCurrentView } = useBranchManagerStore(); // For Branch Manager Dashboard navigation
  const { setCurrentView: setNegotiatorCurrentView } = useNegotiatorStore(); // For Negotiator Dashboard navigation
  const [fetchedVisibility, setFetchedVisibility] = useState<Partial<Record<HousekeepingItemId, boolean>> | null>(null);
  const resolvedVisibility = useMemo(() => {
    const base = { ...DEFAULT_HOUSEKEEPING_VISIBILITY };
    const source = visibleItems ?? fetchedVisibility;
    if (source) {
      for (const key of Object.keys(base) as HousekeepingItemId[]) {
        const nextValue = source[key];
        if (typeof nextValue === 'boolean') {
          base[key] = nextValue;
        }
      }
    }
    return base;
  }, [visibleItems, fetchedVisibility]);

  const isVisible = useCallback(
    (key: HousekeepingItemId) => resolvedVisibility[key] !== false,
    [resolvedVisibility]
  );

  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [stationeryDialogOpen, setStationeryDialogOpen] = useState(false);
  const [invoiceGeneratorDialogOpen, setInvoiceGeneratorDialogOpen] = useState(false);
  const [mileageHistoryOpen, setMileageHistoryOpen] = useState(false);
  const [appraisalOpen, setAppraisalOpen] = useState(false);
  const [appraisalStaffName, setAppraisalStaffName] = useState('');
  const [appraisalStaffBranch, setAppraisalStaffBranch] = useState('');
  const [myAppraisalOpen, setMyAppraisalOpen] = useState(false);
  const [myLatestAppraisal, setMyLatestAppraisal] = useState<StaffAppraisalRequestRow | null>(null);
  const [loadingMyAppraisal, setLoadingMyAppraisal] = useState(false);
  const [appraisalRefreshKey, setAppraisalRefreshKey] = useState(0);

  const holidayStaffOptions = useMemo(
    () => staffMembers.map((s) => ({ id: s.id, name: s.name, branch_name: s.branch })),
    [staffMembers]
  );

  const currentStaffRecord = useMemo(() => {
    const normalizedEmail = (user?.email ?? '').trim().toLowerCase();
    const normalizedName = currentUserName.trim().toLowerCase();

    return (
      staffMembers.find((staff) => (staff.email ?? '').trim().toLowerCase() === normalizedEmail) ??
      staffMembers.find((staff) => staff.name.trim().toLowerCase() === normalizedName) ??
      null
    );
  }, [staffMembers, user?.email, currentUserName]);

  useEffect(() => {
    if (visibleItems) {
      setFetchedVisibility(null);
      return;
    }

    let cancelled = false;
    const loadVisibility = async () => {
      const staffId =
        currentStaffRecord?.id ??
        (user?.user_metadata as any)?.staff_id ??
        (user?.app_metadata as any)?.staff_id ??
        null;
      const config = staffId
        ? await fetchProspectorDashboardConfigByStaffId(staffId)
        : user?.email
          ? await fetchProspectorDashboardConfigByEmail(user.email)
          : null;
      if (!cancelled) {
        setFetchedVisibility(config?.housekeepingItems ?? null);
      }
    };

    void loadVisibility();
    return () => {
      cancelled = true;
    };
  }, [visibleItems, currentStaffRecord?.id, user?.email]);

  useEffect(() => {
    if (agencyId) {
      void loadStaffMembers(agencyId, clientId ?? undefined);
    }
  }, [agencyId, clientId, loadStaffMembers]);

  useEffect(() => {
    const loadLatestAppraisal = async () => {
      if (!agencyId || !currentStaffRecord) {
        setMyLatestAppraisal(null);
        setLoadingMyAppraisal(false);
        return;
      }

      setLoadingMyAppraisal(true);
      const appraisal = await fetchLatestStaffAppraisal({
        agencyId,
        staffId: currentStaffRecord.id,
        staffName: currentStaffRecord.name,
      });
      setMyLatestAppraisal(appraisal);
      setLoadingMyAppraisal(false);
    };

    void loadLatestAppraisal();
  }, [agencyId, currentStaffRecord, appraisalRefreshKey]);

  const handleHolidaySave = useCallback(async (data: { staffMember: string; staffMemberName?: string; dateRange: DateRange; notes: string }) => {
    if (!agencyId) { notifyError('Agency not found.'); return; }
    const fromStr = data.dateRange.from ? format(data.dateRange.from, 'yyyy-MM-dd') : '';
    const toStr = data.dateRange.to ? format(data.dateRange.to, 'yyyy-MM-dd') : fromStr;
    const displayName = data.staffMemberName ?? data.staffMember;

    const req = await createHousekeepingRequest({
      agency_id: agencyId,
      branch_id: effectiveBranchId,
      request_type: 'holiday_request',
      staff_id: data.staffMember,
      staff_name: displayName,
      requested_by: currentUserName,
      payload: { from: fromStr, to: toStr, notes: data.notes },
    });

    if (req) {
      notifySuccess(`Holiday request submitted for ${displayName}`);
      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner', 'client'],
        title: 'New Holiday Request',
        body: `${displayName} requested holiday from ${fromStr} to ${toStr}.`,
        type: 'holiday_request',
        relatedId: req.id,
      });
    } else {
      notifyError('Failed to submit holiday request. Please try again.');
    }
  }, [agencyId, currentUserName, effectiveBranchId]);

  const handleAbsenceSave = useCallback(async (data: { staffMember: string; staffMemberName?: string; dateRange: DateRange; reason: string; notes: string }) => {
    if (!agencyId) { notifyError('Agency not found.'); return; }
    const fromStr = data.dateRange.from ? format(data.dateRange.from, 'yyyy-MM-dd') : '';
    const toStr = data.dateRange.to ? format(data.dateRange.to, 'yyyy-MM-dd') : fromStr;
    const displayName = data.staffMemberName ?? data.staffMember;

    const req = await createHousekeepingRequest({
      agency_id: agencyId,
      branch_id: effectiveBranchId,
      request_type: 'absence_request',
      staff_id: data.staffMember,
      staff_name: displayName,
      requested_by: currentUserName,
      payload: { from: fromStr, to: toStr, reason: data.reason, notes: data.notes },
    });

    if (req) {
      notifySuccess(`Absence booked for ${displayName}`);
      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner', 'client'],
        title: 'New Absence Booking',
        body: `${displayName} absence recorded (${data.reason}) from ${fromStr} to ${toStr}.`,
        type: 'absence_request',
        relatedId: req.id,
      });
    } else {
      notifyError('Failed to submit absence booking. Please try again.');
    }
  }, [agencyId, currentUserName, effectiveBranchId]);

  const handleStationerySave = useCallback(async (data: { item: string; quantity: number; notes: string; staffMember?: string; staffMemberName?: string }) => {
    if (!agencyId) { notifyError('Agency not found.'); return; }
    const displayName = data.staffMemberName ?? null;
    const requesterLabel = data.staffMemberName ?? currentUserName;

    const req = await createHousekeepingRequest({
      agency_id: agencyId,
      branch_id: effectiveBranchId,
      request_type: 'stationery_request',
      staff_id: data.staffMember ?? null,
      staff_name: displayName,
      requested_by: currentUserName,
      payload: { item: data.item, quantity: data.quantity, notes: data.notes },
    });

    if (req) {
      notifySuccess(`Stationery request submitted: ${data.item} x${data.quantity}`);
      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner'],
        title: 'New Stationery Request',
        body: `${requesterLabel} requested ${data.quantity}x ${data.item}.`,
        type: 'stationery_request',
        relatedId: req.id,
      });
    } else {
      notifyError('Failed to submit stationery request. Please try again.');
    }
  }, [agencyId, currentUserName, effectiveBranchId]);

  const handleInvoiceGenerate = useCallback(async (data: { client: string; amount: string; description: string; dueDate: string; staffMember?: string; staffMemberName?: string }) => {
    if (!agencyId) { notifyError('Agency not found.'); return; }

    const req = await createHousekeepingRequest({
      agency_id: agencyId,
      branch_id: effectiveBranchId,
      request_type: 'invoice_request',
      staff_id: data.staffMember ?? null,
      staff_name: data.staffMemberName ?? null,
      requested_by: currentUserName,
      payload: { client: data.client, amount: data.amount, description: data.description, dueDate: data.dueDate },
    });

    if (req) {
      notifySuccess(`Invoice generated for £${data.amount}`);
      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner', 'client'],
        title: 'New Invoice Generated',
        body: `Invoice of £${data.amount} created. Due: ${data.dueDate}.`,
        type: 'invoice_request',
        relatedId: req.id,
      });
    } else {
      notifyError('Failed to generate invoice. Please try again.');
    }
  }, [agencyId, currentUserName, effectiveBranchId]);

  const handleAppraisalSave = useCallback(async (rec: any) => {
    if (!agencyId) { notifyError('Agency not found.'); return; }

    const payload = {
      ...rec,
      staffId: rec.staffId ?? null,
    };

    const req = rec.requestId
      ? await updateHousekeepingRequest(rec.requestId, {
          status: 'completed',
          payload,
          staff_id: rec.staffId ?? null,
          staff_name: rec.staffName,
          branch_id: effectiveBranchId,
        })
      : await createHousekeepingRequest({
          agency_id: agencyId,
          branch_id: effectiveBranchId,
          request_type: 'staff_appraisal',
          staff_id: rec.staffId ?? null,
          staff_name: rec.staffName,
          requested_by: currentUserName,
          payload,
          status: 'completed',
        });

    if (req) {
      notifySuccess(`Appraisal saved for ${rec.staffName}`);
      setAppraisalRefreshKey((prev) => prev + 1);
      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner'],
        title: 'Staff Appraisal Completed',
        body: `Appraisal for ${rec.staffName} (${rec.staffBranch}) has been submitted.`,
        type: 'staff_appraisal',
        relatedId: req.id,
      });
    } else {
      notifyError('Failed to save appraisal. Please try again.');
    }
  }, [agencyId, currentUserName, effectiveBranchId]);

  // Determine which dashboard is currently active to set the correct setCurrentView
  const currentDashboard = useOwnerStore(state => state.isOpen) ? 'owner' : 
                         useBranchManagerStore(state => !!state.selectedStaffMember) ? 'branchManager' :
                         useNegotiatorStore(state => !!state.selectedStaffMember) ? 'negotiator' : 'main';

  const navigateToView = (view: OwnerViewType) => {
    if (currentDashboard === 'owner') {
      setOwnerCurrentView(view);
    } else if (currentDashboard === 'branchManager') {
      setBranchManagerCurrentView(view as any); // Cast as BranchManagerViewType
    } else if (currentDashboard === 'negotiator') {
      setNegotiatorCurrentView(view as any); // Cast as NegotiatorViewType
    }
    // For main dashboard, if HouseKeeping is a top-level tab, it would handle its own navigation
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="space-y-1 mb-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          House Keeping
        </h1>
        <p className="text-muted-foreground">
          Tools for managing records, appraisals, documents, and operational requests.
        </p>
      </div>

      {currentStaffRecord && isVisible('latest-appraisal') ? (
        <Card className="bg-card text-card-foreground border-border">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-foreground">My Latest Appraisal & Feedback</CardTitle>
              <p className="text-sm text-muted-foreground">
                This is where the staff member can see the saved appraisal feedback.
              </p>
            </div>
            {myLatestAppraisal?.payload ? (
              <Button
                variant="outline"
                className="shrink-0"
                onClick={() => setMyAppraisalOpen(true)}
              >
                <FileTextIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                View Full Appraisal
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {loadingMyAppraisal ? (
              <p className="text-sm text-muted-foreground">Loading appraisal feedback...</p>
            ) : myLatestAppraisal?.payload ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span>Staff: <span className="text-foreground font-medium">{currentStaffRecord.name}</span></span>
                  <span>Branch: <span className="text-foreground font-medium">{myLatestAppraisal.payload.staffBranch || currentStaffRecord.branch}</span></span>
                  <span>Period: <span className="text-foreground font-medium">{myLatestAppraisal.payload.month === 'all' ? 'All Months' : myLatestAppraisal.payload.month} {myLatestAppraisal.payload.year}</span></span>
                  <span>Completed By: <span className="text-foreground font-medium">{myLatestAppraisal.payload.completedBy || myLatestAppraisal.requested_by || 'Manager'}</span></span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Manager Comments & Feedback</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {myLatestAppraisal.payload.notes?.trim() || 'No written feedback was added to this appraisal yet.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved appraisal feedback is available for your staff profile yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Holiday Request Card */}
        {isVisible('holiday-request') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setHolidayDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Holiday Request
              </CardTitle>
              <CalendarCheckIcon className="h-6 w-6 text-green-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Submit and manage staff holiday requests.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Absence Booking Card */}
        {isVisible('absence-booking') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setAbsenceDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Absence Booking
              </CardTitle>
              <CalendarXIcon className="h-6 w-6 text-red-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Record staff absences and sick leave.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Assessment Records Card */}
        {isVisible('assessment-records') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => navigateToView('compliance-tasks-list')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Assessment Records
              </CardTitle>
              <ClipboardCheckIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage all staff assessments and performance records.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Appraisal Records Card */}
        {isVisible('appraisal-records') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setAppraisalOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Appraisal Records
              </CardTitle>
              <FileTextIcon className="h-6 w-6 text-tertiary" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Keep track of all staff appraisals and reviews.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Document Uploads Card */}
        {isVisible('document-uploads') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => navigateToView('compliance-documents')} // Navigate to ComplianceDocumentsView
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Document Uploads
              </CardTitle>
              <UploadCloudIcon className="h-6 w-6 text-warning" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload and manage important files and documents.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Mileage Logs Card */}
        {isVisible('mileage-logs') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setMileageHistoryOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Mileage Logs
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage staff travel and mileage records.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Stationery Request Card */}
        {isVisible('stationery-request') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setStationeryDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Stationery Request
              </CardTitle>
              <PrinterIcon className="h-6 w-6 text-blue-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Submit requests for office stationery and supplies.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Invoice Generator Card */}
        {isVisible('invoice-generator') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => setInvoiceGeneratorDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Invoice Generator
              </CardTitle>
              <DollarSignIcon className="h-6 w-6 text-green-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and send professional invoices to clients.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Invoice Template Card */}
        {isVisible('invoice-templates') ? (
          <Card 
            className="bg-card text-card-foreground transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer"
            onClick={() => navigateToView('invoice-template')} // Navigate to InvoiceTemplateView
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold text-foreground">
                Invoice Templates
              </CardTitle>
              <LayoutTemplateIcon className="h-6 w-6 text-purple-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage and customize your invoice templates.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Commission Graph Card */}
      {isVisible('commission-trend') ? (
        <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Commission Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Monthly commission earnings</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={commissionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))'
                }}
                formatter={(value: number) => `£${value.toLocaleString()}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="commission" 
                stroke="#FFB800" 
                strokeWidth={3}
                name="Commission"
                dot={{ fill: '#FFB800', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
        </Card>
      ) : null}

      <HolidayRequestDialog 
        open={holidayDialogOpen} 
        onOpenChange={setHolidayDialogOpen} 
        onSave={handleHolidaySave} 
        agencyId={agencyId}
        branchName={effectiveBranchName}
        staffMembers={holidayStaffOptions}
      />
      <AbsenceBookingDialog 
        open={absenceDialogOpen} 
        onOpenChange={setAbsenceDialogOpen} 
        onSave={handleAbsenceSave} 
        agencyId={agencyId}
        branchName={effectiveBranchName}
        staffMembers={holidayStaffOptions}
      />
      <StationeryRequestDialog
        open={stationeryDialogOpen}
        onOpenChange={setStationeryDialogOpen}
        onSave={handleStationerySave}
        agencyId={agencyId}
        branchName={effectiveBranchName}
        staffMembers={holidayStaffOptions}
      />
      <InvoiceGeneratorDialog
        open={invoiceGeneratorDialogOpen}
        onOpenChange={setInvoiceGeneratorDialogOpen}
        onGenerate={handleInvoiceGenerate}
        agencyId={agencyId}
        branchName={effectiveBranchName}
      />
      <MileageHistoryDialog
        open={mileageHistoryOpen}
        onOpenChange={setMileageHistoryOpen}
      />

      <StaffAppraisalDialog
        open={appraisalOpen}
        onOpenChange={setAppraisalOpen}
        staffName={appraisalStaffName}
        staffBranch={appraisalStaffBranch}
        onSave={handleAppraisalSave}
        agencyId={agencyId}
        onStaffSelected={(name, branch) => { setAppraisalStaffName(name); setAppraisalStaffBranch(branch); }}
      />

      <StaffAppraisalDialog
        open={myAppraisalOpen}
        onOpenChange={setMyAppraisalOpen}
        staffName={currentStaffRecord?.name ?? ''}
        staffBranch={currentStaffRecord?.branch ?? ''}
        onSave={() => {}}
        agencyId={agencyId}
        readOnly
        initialStaffId={currentStaffRecord?.id}
        initialYear={myLatestAppraisal?.payload?.year}
        initialMonth={myLatestAppraisal?.payload?.month}
      />
    </div>
  );
}
