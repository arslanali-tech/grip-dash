import React, { useState } from 'react';
import {
  XIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  MessageSquareIcon,
  EditIcon,
  FileTextIcon,
  TrashIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OwnerProspectStatus, OwnerProspectStatusBadge } from '@/components/OwnerProspectStatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Interaction {
  type: 'email' | 'call' | 'mail' | 'meeting';
  date: string;
  notes: string;
}

interface EstateAgentProspect {
  id: string;
  addedDate: string;
  name: string;
  agency: string;
  email: string;
  phone: string;
  address: string;
  status: OwnerProspectStatus;
  lastInteraction?: Interaction;
}

interface ProspectDetailViewProps {
  prospect: EstateAgentProspect;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: OwnerProspectStatus) => void;
  onDelete?: () => void;
  onLogInteraction?: (type: Interaction['type']) => void;
}

export function ProspectDetailView({
  prospect,
  onClose,
  onStatusChange,
  onDelete,
  onLogInteraction,
}: ProspectDetailViewProps) {
  const [note, setNote] = useState('');

  const handleAddNote = () => {
    console.log('Adding note:', note);
    setNote('');
    // In a real app, save note to store/backend
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl bg-background max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-xl">{prospect.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{prospect.agency}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLogInteraction && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Log interaction
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                  <DropdownMenuItem onClick={() => onLogInteraction('email')}>
                    <MailIcon className="mr-2 h-4 w-4" /> Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLogInteraction('call')}>
                    <PhoneIcon className="mr-2 h-4 w-4" /> Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLogInteraction('mail')}>
                    <MessageSquareIcon className="mr-2 h-4 w-4" /> Mail
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onLogInteraction('meeting')}>
                    <CalendarIcon className="mr-2 h-4 w-4" /> Meeting
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <TrashIcon className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}

            <OwnerProspectStatusBadge status={prospect.status} prospectId={prospect.id} onStatusChange={onStatusChange} />

            <Button variant="ghost" size="icon" onClick={onClose}>
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Details */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Contact Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">{prospect.email}</a>
                  </div>
                  <div className="flex items-center gap-3">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{prospect.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{prospect.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Added: {new Date(prospect.addedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <EditIcon className="mr-2 h-4 w-4" /> Edit Details
                </Button>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <FileTextIcon className="mr-2 h-4 w-4" /> Convert to Order
                </Button>
              </div>
            </div>

            {/* Middle/Right Column: Activity & Notes */}
            <div className="md:col-span-2 space-y-6">
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger value="notes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Notes</TabsTrigger>
                  <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Activity</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">History</TabsTrigger>
                  <TabsTrigger value="emails" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Emails</TabsTrigger>
                </TabsList>

                <TabsContent value="notes" className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-note">Add a note</Label>
                    <Textarea 
                      id="new-note" 
                      placeholder="Type your note here..." 
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleAddNote}>Save Note</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground">Recent Notes</h4>
                    {/* Mock Notes */}
                    <div className="bg-muted/30 p-3 rounded-md text-sm">
                      <p className="text-foreground">Interested in our premium package. Follow up next week.</p>
                      <p className="text-xs text-muted-foreground mt-2">Added by You • 2 days ago</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="pt-4">
                  <div className="space-y-4">
                    {prospect.lastInteraction ? (
                      <div className="flex gap-4 items-start">
                        <div className="mt-1 bg-blue-100 p-2 rounded-full text-blue-600">
                          <MessageSquareIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{prospect.lastInteraction.type.charAt(0).toUpperCase() + prospect.lastInteraction.type.slice(1)}</p>
                          <p className="text-sm text-muted-foreground">{prospect.lastInteraction.notes}</p>
                          <p className="text-xs text-muted-foreground mt-1">{prospect.lastInteraction.date}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent activity.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Status History</h4>
                    <div className="space-y-6 relative pl-4 border-l border-border ml-2">
                      {/* Mock History Items - Simulating a full journey */}
                      {prospect.status === 'signed-up' && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-green-600">Signed Up</span></p>
                            <Button variant="outline" size="sm" className="h-6 text-xs gap-1">
                              <FileTextIcon className="h-3 w-3" /> View Order Form
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Today by You</p>
                        </div>
                      )}

                      {(prospect.status === 'signed-up' || prospect.status === 'sent-order-form') && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-yellow-500 border-2 border-background" />
                          <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-yellow-600">Sent Order Form</span></p>
                          <p className="text-xs text-muted-foreground">Yesterday by You</p>
                        </div>
                      )}

                      {(prospect.status === 'signed-up' || prospect.status === 'sent-order-form' || prospect.status === 'meeting') && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-indigo-500 border-2 border-background" />
                          <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-indigo-600">Meeting</span></p>
                          <p className="text-xs text-muted-foreground">3 days ago by You</p>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-background" />
                        <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-orange-600">Called</span></p>
                        <p className="text-xs text-muted-foreground">1 week ago by You</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
                        <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-blue-600">Emailed</span></p>
                        <p className="text-xs text-muted-foreground">2 weeks ago by You</p>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-background" />
                        <p className="text-sm font-medium">Status changed to <span className="capitalize font-bold text-gray-600">Prospect</span></p>
                        <p className="text-xs text-muted-foreground">{new Date(prospect.addedDate).toLocaleDateString()} by System</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="emails" className="pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Email History</h4>
                      <Button size="sm" variant="outline" className="h-8">
                        <MailIcon className="w-3 h-3 mr-2" /> Compose
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {/* Mock Emails */}
                      <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-semibold text-sm text-foreground">Re: Introduction to GRIP</h5>
                          <span className="text-xs text-muted-foreground">Yesterday</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">To: {prospect.email}</p>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          Hi {prospect.name.split(' ')[0]}, just following up on our conversation yesterday. I've attached the brochure we discussed...
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-semibold text-sm text-foreground">Meeting Confirmation</h5>
                          <span className="text-xs text-muted-foreground">Jan 24</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">From: {prospect.email}</p>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          Thanks for the invite. Tuesday at 2pm works perfectly for me. Looking forward to seeing the demo.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="font-semibold text-sm text-foreground">GRIP Platform Overview</h5>
                          <span className="text-xs text-muted-foreground">Jan 20</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">To: {prospect.email}</p>
                        <p className="text-sm text-foreground/80 line-clamp-2">
                          Hello {prospect.name.split(' ')[0]}, I wanted to introduce you to GRIP, the all-in-one dashboard for estate agents...
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
