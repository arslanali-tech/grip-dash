import { useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, SearchIcon, FilterIcon, XIcon, FileTextIcon, CheckboxIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  description: string;
  type: string;
  status: string;
}

const mockDocuments: Document[] = [
  { id: 'd1', description: 'Bailey-Predovic PLC', type: 'Statutory Record', status: 'All' },
  { id: 'd2', description: 'Appointment of BEOGS as Chairman', type: 'Form', status: 'Working documents' },
  { id: 'd3', description: 'BitzDay ABC 2024', type: 'Statutory Record', status: 'All' },
  { id: 'd4', description: 'Group Structure for ABCCARS_0003', type: 'Statutory Record', status: 'All' },
  { id: 'd5', description: 'Group Voting and Capital PC (Side by Side) (HTML)', type: 'Formfill', status: 'Formfill' },
  { id: 'd6', description: 'Letter of Application on Allotment', type: 'Statutory Record', status: 'All' },
  { id: 'd7', description: 'Change of RLE\'s Name of UMHOLDINGS', type: 'Statutory Record', status: 'All' },
  { id: 'd8', description: 'Report of Shareholders for ABCCARS_0003', type: 'Report', status: 'Working documents' },
  { id: 'd9', description: 'Register of People with Significant Control for ABCCARS_0003', type: 'Statutory Record', status: 'All' },
];

export function ComplianceDocumentsView() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documentSummaryOpen, setDocumentSummaryOpen] = useState(true);
  const [documentDetailsOpen, setDocumentDetailsOpen] = useState(true);

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || doc.status.toLowerCase().includes(activeTab);
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] p-6 md:p-8 relative z-10">
      {/* Left Section: Key Features */}
      <div className="lg:w-1/2 lg:pr-12 space-y-8 mb-8 lg:mb-0">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Key Features
        </h2>
        <h1 className="font-heading text-4xl font-bold text-foreground leading-tight">
          Power your entity governance and compliance with AI-driven efficiency
        </h1>

        <Accordion type="multiple" defaultValue={["item-1"]}>
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
              Instantly surface what matters with AI
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Ask a question in Diligent Entities or Microsoft Teams and get immediate answers from an AI assistant on ownership, directors, filings and more – no digging required.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
              Accelerate data entry and information extraction with automation
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Automate the extraction of key data points from documents, reducing manual effort and errors.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
              Smarter charts for faster reporting
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Generate insightful visualizations and reports with AI-powered analytics.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
              Never miss a compliance deadline
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Receive proactive alerts and reminders for upcoming compliance deadlines.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Right Section: Tablet Frame with Document Viewer */}
      <div className="lg:w-1/2 flex justify-center items-center relative">
        <div className="relative w-full max-w-[600px] aspect-[3/4] bg-gray-800 rounded-[2rem] shadow-2xl p-4 flex flex-col overflow-hidden">
          {/* Tablet Bezel/Screen */}
          <div className="flex-1 bg-white rounded-[1.5rem] overflow-hidden flex flex-col">
            {/* Document Viewer Header */}
            <div className="bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-semibold text-foreground">Documents</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <SearchIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Document Viewer Tabs */}
            <div className="bg-card border-b border-border p-2 flex justify-start">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-auto p-0 bg-transparent text-muted-foreground">
                  <TabsTrigger value="all" className="px-3 py-1.5 text-sm data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-md">All</TabsTrigger>
                  <TabsTrigger value="working documents" className="px-3 py-1.5 text-sm data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-md">Working documents</TabsTrigger>
                  <TabsTrigger value="formfill" className="px-3 py-1.5 text-sm data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-md">Formfill</TabsTrigger>
                  <TabsTrigger value="electronic filing" className="px-3 py-1.5 text-sm data-[state=active]:bg-muted data-[state=active]:text-foreground rounded-md">Electronic filing</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Document List and Search */}
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-muted text-foreground h-8 text-sm"
              />
              <Button variant="outline" size="sm" className="h-8 text-sm">
                <FilterIcon className="h-4 w-4 mr-1" /> Filters
              </Button>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300" />
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{doc.description}</span>
                  <span className="text-muted-foreground text-xs">{doc.type}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">Records 1 - {filteredDocuments.length} of {mockDocuments.length} records found</p>
            </div>

            {/* AI Document Summary Section */}
            <div className="bg-muted/50 p-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">AI Document Summary</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Document dated September 6, 2023</p>
                <p>• Philip Acevedo applies for 50,000 ordinary shares of £1.00 each in the capital of ABC International Ltd PLC.</p>
                <p>• The total consideration for the shares is £50,000.00.</p>
                <p>• Acevedo undertakes to pay the full amount for the shares.</p>
                <p>• The shares will be registered in Acevedo's name.</p>
                <p>• Acevedo acknowledges that the shares will be held subject to the company's articles of association.</p>
                <p>• The document is addressed to the Directors of ABC International Ltd PLC at their registered office address.</p>
                <a href="#" className="text-primary hover:underline">Learn more</a>
              </div>
            </div>

            {/* Document For Section */}
            <div className="bg-muted/50 p-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">Document For</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Bailey-Predovic PLC, 123, Bailey-Predovic PLC.</p>
                <p>QuickRef: BAILEYPRDFBO</p>
              </div>
            </div>

            {/* Document Details Section */}
            <div className="bg-muted/50 p-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">Document Details</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDownIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>
                  <p>Description</p>
                  <p className="font-medium text-foreground">Related Undertakings Report for BAILEYPRDFBO</p>
                </div>
                <div>
                  <p>Format</p>
                  <p className="font-medium text-foreground">DOC</p>
                </div>
                <div>
                  <p>DocRef</p>
                  <p className="font-medium text-foreground">12583</p>
                </div>
                <div>
                  <p>Produced on</p>
                  <p className="font-medium text-foreground">21/04/2022 11:03:23</p>
                </div>
                <div>
                  <p>Form Number</p>
                  <p className="font-medium text-foreground">B-16</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
