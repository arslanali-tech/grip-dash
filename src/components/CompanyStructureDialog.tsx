import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2Icon, MapPinIcon, NetworkIcon, UserIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ClientBranchRow, ClientStaffRow } from '@/lib/ownerApi';

interface CompanyStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  branches?: ClientBranchRow[];
  staff?: ClientStaffRow[];
}

export function CompanyStructureDialog({
  open,
  onOpenChange,
  clientName,
  branches = [],
  staff = [],
}: CompanyStructureDialogProps) {
  const staffByBranch = useMemo(() => {
    const byBranch = new Map<string, ClientStaffRow[]>();
    for (const b of branches) {
      byBranch.set(b.id, []);
    }

    const unassigned: ClientStaffRow[] = [];

    for (const s of staff) {
      if (s.branch_id && byBranch.has(s.branch_id)) {
        byBranch.get(s.branch_id)!.push(s);
      } else {
        unassigned.push(s);
      }
    }

    return { byBranch, unassigned };
  }, [branches, staff]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col bg-card text-card-foreground p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <NetworkIcon className="h-5 w-5 text-primary" />
            Company Flow - {clientName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/10 p-6">
          <div className="space-y-6">
            <Card className="border border-border bg-card">
              <div className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-foreground truncate">{clientName}</h3>
                  <p className="text-sm text-muted-foreground">Head Office</p>
                </div>
                <Badge variant="outline" className="ml-auto bg-primary/5 text-primary border-primary/20">
                  Main Owner
                </Badge>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.length === 0 && (
                <div className="md:col-span-2 p-4 rounded-lg border border-border bg-background text-sm text-muted-foreground">
                  No branches configured yet.
                </div>
              )}

              {branches.map((b) => {
                const staffForBranch = staffByBranch.byBranch.get(b.id) ?? [];

                return (
                  <Card key={b.id} className="border border-border bg-card">
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                            <MapPinIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate">{b.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{b.address ?? 'No address'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {staffForBranch.length} staff
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {staffForBranch.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No staff assigned.</p>
                        ) : (
                          staffForBranch.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-background">
                              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.role}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {staffByBranch.unassigned.length > 0 && (
              <Card className="border border-border bg-card">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-foreground">Unassigned staff</h4>
                    <Badge variant="outline">{staffByBranch.unassigned.length}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {staffByBranch.unassigned.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-background">
                        <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-muted/10 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
