import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareIcon, Loader2Icon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboardStore } from '@/stores/dashboardStore';
import { fetchClientStaffForAgency, fetchClientBranchesForAgency, ClientStaffRow, ClientBranchRow } from '@/lib/ownerApi';
import { useToast } from '@/hooks/use-toast';

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentId?: string;
  onShare?: (shareData: { type: 'staff' | 'branch' | 'email'; targetId?: string; email?: string }) => void;
}

export function ShareDocumentDialog({ open, onOpenChange, documentName, documentId, onShare }: ShareDocumentDialogProps) {
  const { agencyId } = useDashboardStore();
  const { toast } = useToast();
  
  const [shareType, setShareType] = useState<'staff' | 'branch' | 'email'>('staff');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [email, setEmail] = useState('');
  
  // Dynamic data from database
  const [staff, setStaff] = useState<ClientStaffRow[]>([]);
  const [branches, setBranches] = useState<ClientBranchRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Load staff from database
  useEffect(() => {
    const loadStaff = async () => {
      if (!agencyId || !open) return;
      
      setLoadingStaff(true);
      try {
        const staffData = await fetchClientStaffForAgency(agencyId);
        setStaff(staffData);
      } catch (error) {
        console.error('Error loading staff', error);
      } finally {
        setLoadingStaff(false);
      }
    };
    
    void loadStaff();
  }, [agencyId, open]);

  // Load branches from database
  useEffect(() => {
    const loadBranches = async () => {
      if (!agencyId || !open) return;
      
      setLoadingBranches(true);
      try {
        const branchData = await fetchClientBranchesForAgency(agencyId);
        setBranches(branchData);
      } catch (error) {
        console.error('Error loading branches', error);
      } finally {
        setLoadingBranches(false);
      }
    };
    
    void loadBranches();
  }, [agencyId, open]);

  const resetForm = () => {
    setSelectedStaff('');
    setSelectedBranch('');
    setEmail('');
  };

  const handleShare = async () => {
    // Validate based on share type
    if (shareType === 'staff' && !selectedStaff) {
      toast({ title: 'Error', description: 'Please select a staff member', variant: 'destructive' });
      return;
    }
    if (shareType === 'branch' && !selectedBranch) {
      toast({ title: 'Error', description: 'Please select a branch', variant: 'destructive' });
      return;
    }
    if (shareType === 'email' && !email.trim()) {
      toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setIsSharing(true);
    try {
      if (onShare) {
        await onShare({
          type: shareType,
          targetId: shareType === 'staff' ? selectedStaff : shareType === 'branch' ? selectedBranch : undefined,
          email: shareType === 'email' ? email.trim() : undefined,
        });
      }
      
      const targetName = shareType === 'staff' 
        ? staff.find(s => s.id === selectedStaff)?.name 
        : shareType === 'branch'
        ? branches.find(b => b.id === selectedBranch)?.name
        : email;
        
      toast({
        title: 'Shared',
        description: `"${documentName}" shared with ${targetName}`,
      });
      
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to share document', variant: 'destructive' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShareIcon className="h-5 w-5 text-primary" />
            Share "{documentName}"
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={shareType} onValueChange={(v) => setShareType(v as 'staff' | 'branch' | 'email')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="branch">Branch</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          
          <div className="py-4">
            <TabsContent value="staff" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-foreground">Select Staff Member</Label>
                {loadingStaff ? (
                  <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading staff...
                  </div>
                ) : (
                  <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Select staff..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      {staff.length === 0 ? (
                        <SelectItem value="no-staff" disabled>No staff members found</SelectItem>
                      ) : (
                        staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} {member.role && `(${member.role})`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="branch" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-foreground">Select Branch</Label>
                {loadingBranches ? (
                  <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Loading branches...
                  </div>
                ) : (
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="bg-background text-foreground border-border">
                      <SelectValue placeholder="Select branch..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground">
                      {branches.length === 0 ? (
                        <SelectItem value="no-branch" disabled>No branches found</SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="email" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-foreground">Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="recipient@example.com" 
                  className="bg-background text-foreground border-border"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)} 
            className="text-foreground hover:bg-accent"
            disabled={isSharing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isSharing}
          >
            {isSharing ? (
              <>
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              'Share'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
