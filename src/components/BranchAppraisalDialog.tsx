import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheckIcon, SaveIcon, XIcon, DownloadIcon, HistoryIcon } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { exportElementToPdf } from '@/lib/exportPdf';

interface BranchAppraisalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  onSave: (data: any) => void;
}

interface RightmoveAnalysisRow {
  agent: string;
  fs: string;
  sstc: string;
  total: string;
  percentage: string;
}

export function BranchAppraisalDialog({ open, onOpenChange, branchName, onSave }: BranchAppraisalDialogProps) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [exporting, setExporting] = useState(false);
  const [currentBranchName, setCurrentBranchName] = useState(branchName);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [branchPremises, setBranchPremises] = useState('');
  const [marketPosition, setMarketPosition] = useState('');
  const [staffDevelopment, setStaffDevelopment] = useState('');
  const [marketing, setMarketing] = useState('');
  const [resultsAgainstTargets, setResultsAgainstTargets] = useState('');
  const [managementStyle, setManagementStyle] = useState('');
  const [sixPointPlan, setSixPointPlan] = useState('');
  const [sixPointPlanText, setSixPointPlanText] = useState(`1. Review previous days applicants each day for the lost opportunities.
2. Get the teams on board for the group objective, get them all to understand the importance of key subjects such as vals, fs leads, viewings and offers.
3. Improve market share in your area to the required level.
4. Add a new level of focus to lettings, following up valuations for possible lettings leads.
5. Leaflet main roads monthly in your area.
6. Drop leaflets every month on the key new estates as discussed.`);
  const [customerService, setCustomerService] = useState('');
  const [keyFocus, setKeyFocus] = useState('');
  const [meetingHeldBy, setMeetingHeldBy] = useState('');
  const [meetingWith, setMeetingWith] = useState('');
  
  const [rightmoveAnalysis, setRightmoveAnalysis] = useState<RightmoveAnalysisRow[]>([
    { agent: 'Our Branch', fs: '', sstc: '', total: '', percentage: '' },
    { agent: 'Competitor A', fs: '', sstc: '', total: '', percentage: '' },
    { agent: 'Competitor B', fs: '', sstc: '', total: '', percentage: '' },
    { agent: 'Competitor C', fs: '', sstc: '', total: '', percentage: '' },
  ]);

  // Load saved data if available (mock implementation)
  useEffect(() => {
    if (open) {
      setCurrentBranchName(branchName);
      const savedData = localStorage.getItem(`branch-meeting-${branchName}-${date}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.branchName) setCurrentBranchName(parsed.branchName);
          setBranchPremises(parsed.branchPremises || '');
          setMarketPosition(parsed.marketPosition || '');
          setStaffDevelopment(parsed.staffDevelopment || '');
          setMarketing(parsed.marketing || '');
          setResultsAgainstTargets(parsed.resultsAgainstTargets || '');
          setManagementStyle(parsed.managementStyle || '');
          setSixPointPlan(parsed.sixPointPlan || '');
          if (parsed.sixPointPlanText) setSixPointPlanText(parsed.sixPointPlanText);
          setCustomerService(parsed.customerService || '');
          setKeyFocus(parsed.keyFocus || '');
          setMeetingHeldBy(parsed.meetingHeldBy || '');
          setMeetingWith(parsed.meetingWith || '');
          setRightmoveAnalysis(parsed.rightmoveAnalysis || []);
        } catch (e) {
          console.error('Failed to load saved meeting data', e);
        }
      }
    }
  }, [open, branchName, date]);

  const handleRightmoveChange = (index: number, field: keyof RightmoveAnalysisRow, value: string) => {
    const newData = [...rightmoveAnalysis];
    newData[index] = { ...newData[index], [field]: value };
    setRightmoveAnalysis(newData);
  };

  const handleSave = () => {
    const data = {
      branchName: currentBranchName,
      date,
      branchPremises,
      marketPosition,
      staffDevelopment,
      marketing,
      resultsAgainstTargets,
      managementStyle,
      sixPointPlan,
      sixPointPlanText,
      customerService,
      keyFocus,
      meetingHeldBy,
      meetingWith,
      rightmoveAnalysis,
      lastModified: new Date().toISOString(),
    };

    // Save to local storage for persistence
    localStorage.setItem(`branch-meeting-${branchName}-${date}`, JSON.stringify(data));

    onSave(data);
    onOpenChange(false);
  };

  const handleExportPdf = async () => {
    const el = exportRef.current;
    if (!el) return;

    try {
      setExporting(true);

      const safeBranch = String(currentBranchName || branchName || 'branch')
        .trim()
        .replace(/[^a-z0-9-_]+/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);

      const safeDate = String(date || '').trim() || format(new Date(), 'yyyy-MM-dd');
      const filename = `Branch_Appraisal_${safeBranch}_${safeDate}.pdf`;

      await exportElementToPdf(el, {
        filename,
        orientation: 'portrait',
        capture: 'bounds',
        marginPt: 24,
        scale: 2,
        backgroundColor: '#ffffff',
        onClone: (clonedDocument, clonedElement) => {
          // Expand any scrollable container so the full dialog content renders into the canvas.
          const scrollContainer = clonedElement.querySelector('[data-export-scroll]') as HTMLElement | null;
          if (scrollContainer) {
            scrollContainer.style.overflow = 'visible';
            scrollContainer.style.maxHeight = 'none';
            scrollContainer.style.height = 'auto';
            scrollContainer.style.flex = 'none';
          }

          // Remove max-height constraints on ancestors (dialog content) in the cloned DOM.
          let node: HTMLElement | null = clonedElement;
          while (node && node !== clonedDocument.body) {
            node.style.maxHeight = 'none';
            node.style.height = 'auto';
            node.style.overflow = 'visible';
            node.style.transform = 'none';
            node = node.parentElement;
          }
        },
      });
    } finally {
      setExporting(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] bg-card text-card-foreground p-0 flex flex-col">
        <div ref={exportRef} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground text-2xl flex items-center gap-2">
                <ClipboardCheckIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                Monthly Branch Meeting
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleExportPdf}
                  disabled={exporting}
                >
                  <DownloadIcon className="h-4 w-4" strokeWidth={1.5} />
                  {exporting ? 'Exporting…' : 'Export PDF'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div data-export-scroll className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {/* Header Info & History */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-border pb-6">
                <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Branch</Label>
                    <Input 
                        value={currentBranchName} 
                        onChange={(e) => setCurrentBranchName(e.target.value)}
                        className="w-full bg-background text-foreground font-semibold text-lg h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Date</Label>
                    <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-background text-foreground"
                    />
                </div>
                
                <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1">
                        <HistoryIcon className="h-3 w-3" /> Previous Meetings
                    </Label>
                    <Select onValueChange={(value) => setDate(value)}>
                        <SelectTrigger className="bg-background text-foreground border-border">
                            <SelectValue placeholder="Select past meeting..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={format(new Date(), 'yyyy-MM-dd')}>Current (New)</SelectItem>
                            <SelectItem value={format(subMonths(new Date(), 1), 'yyyy-MM-dd')}>
                                {format(subMonths(new Date(), 1), 'MMMM yyyy')}
                            </SelectItem>
                            <SelectItem value={format(subMonths(new Date(), 2), 'yyyy-MM-dd')}>
                                {format(subMonths(new Date(), 2), 'MMMM yyyy')}
                            </SelectItem>
                            <SelectItem value={format(subMonths(new Date(), 3), 'yyyy-MM-dd')}>
                                {format(subMonths(new Date(), 3), 'MMMM yyyy')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-bold border-b border-border pb-2 text-foreground">Overview</h3>
                
                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Branch & Premises</Label>
                    <p className="text-sm text-muted-foreground">Current presentation against the competition, location & plans for 2024</p>
                    <Textarea 
                        value={branchPremises}
                        onChange={(e) => setBranchPremises(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="The branch is one big billboard, what could you do with it?"
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Your position in your marketplace</Label>
                    <p className="text-sm text-muted-foreground">How do you rate against the competition? Rightmove statistics?</p>
                    <Textarea 
                        value={marketPosition}
                        onChange={(e) => setMarketPosition(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Review next quarter..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Staff levels & the development of your team</Label>
                    <p className="text-sm text-muted-foreground">Understand the need to develop your team members individually</p>
                    <Textarea 
                        value={staffDevelopment}
                        onChange={(e) => setStaffDevelopment(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Development plans..."
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">Rightmove Analysis</h3>
                <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-foreground">Agent</th>
                                <th className="px-4 py-2 text-center font-medium text-foreground">FS</th>
                                <th className="px-4 py-2 text-center font-medium text-foreground">SSTC</th>
                                <th className="px-4 py-2 text-center font-medium text-foreground">TOTAL</th>
                                <th className="px-4 py-2 text-center font-medium text-foreground">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rightmoveAnalysis.map((row, index) => (
                                <tr key={index} className="bg-card">
                                    <td className="p-2">
                                        <Input 
                                            value={row.agent} 
                                            onChange={(e) => handleRightmoveChange(index, 'agent', e.target.value)}
                                            className="h-8 bg-background text-foreground"
                                            placeholder="Agent Name"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input 
                                            value={row.fs} 
                                            onChange={(e) => handleRightmoveChange(index, 'fs', e.target.value)}
                                            className="h-8 text-center bg-background text-foreground"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input 
                                            value={row.sstc} 
                                            onChange={(e) => handleRightmoveChange(index, 'sstc', e.target.value)}
                                            className="h-8 text-center bg-background text-foreground"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input 
                                            value={row.total} 
                                            onChange={(e) => handleRightmoveChange(index, 'total', e.target.value)}
                                            className="h-8 text-center bg-background text-foreground"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <Input 
                                            value={row.percentage} 
                                            onChange={(e) => handleRightmoveChange(index, 'percentage', e.target.value)}
                                            className="h-8 text-center bg-background text-foreground"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-2 bg-muted/50 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={() => setRightmoveAnalysis([...rightmoveAnalysis, { agent: '', fs: '', sstc: '', total: '', percentage: '' }])}>
                            + Add Row
                        </Button>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Marketing</Label>
                    <p className="text-sm text-muted-foreground">Existing & proposed including nurture and where to attract the next valuations from</p>
                    <Textarea 
                        value={marketing}
                        onChange={(e) => setMarketing(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Marketing strategies..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Results against targets/desired levels</Label>
                    <p className="text-sm text-muted-foreground">Three steady months, need more instructions and vals converted to be saleable.</p>
                    <Textarea 
                        value={resultsAgainstTargets}
                        onChange={(e) => setResultsAgainstTargets(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Performance review..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Management style & structure</Label>
                    <p className="text-sm text-muted-foreground">Do you need to improve - If so, in what area?</p>
                    <Textarea 
                        value={managementStyle}
                        onChange={(e) => setManagementStyle(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Self reflection..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Six-point plan - Review this every quarter</Label>
                    <Textarea 
                        value={sixPointPlanText}
                        onChange={(e) => setSixPointPlanText(e.target.value)}
                        className="min-h-[150px] resize-y bg-background text-foreground font-medium"
                        placeholder="Enter the six-point plan here..."
                    />
                    <Textarea 
                        value={sixPointPlan}
                        onChange={(e) => setSixPointPlan(e.target.value)}
                        className="min-h-[100px] resize-y bg-background text-foreground mt-2"
                        placeholder="Notes on six-point plan..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Customer service delivered by your branch</Label>
                    <p className="text-sm text-muted-foreground">Is it good enough, how is it reviewed, how can you improve? Google reviews are vital, how to get more?</p>
                    <Textarea 
                        value={customerService}
                        onChange={(e) => setCustomerService(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Customer service review..."
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">Key focus for the coming Month</Label>
                    <p className="text-sm text-muted-foreground">Please detail your key focus areas.</p>
                    <Textarea 
                        value={keyFocus}
                        onChange={(e) => setKeyFocus(e.target.value)}
                        className="min-h-[120px] resize-y bg-background text-foreground"
                        placeholder="Key focus points..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
                    <div className="space-y-2">
                        <Label className="text-base font-semibold text-foreground">Meeting held by</Label>
                        <Input 
                            value={meetingHeldBy}
                            onChange={(e) => setMeetingHeldBy(e.target.value)}
                            className="bg-background text-foreground"
                            placeholder="Name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-base font-semibold text-foreground">With (Branch Manager)</Label>
                        <Input 
                            value={meetingWith}
                            onChange={(e) => setMeetingWith(e.target.value)}
                            className="bg-background text-foreground"
                            placeholder="Name"
                        />
                    </div>
                </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border shrink-0 flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <XIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <SaveIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Save Meeting Notes
          </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
