import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  PlayCircleIcon,
  BookOpenIcon,
  VideoIcon,
  CheckCircle2Icon,
  SparklesIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action text
}

interface TutorialModule {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  duration: string;
  steps: TutorialStep[];
  videoUrl?: string;
}

const tutorialModules: TutorialModule[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with GRIP',
    description: 'Learn the basics of navigating GRIP and understanding the dashboard',
    icon: PlayCircleIcon,
    duration: '5 min',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to GRIP!',
        description: 'GRIP is your all-in-one estate agency management system. Let\'s take a quick tour of the main features.',
      },
      {
        id: 'navigation',
        title: 'Main Navigation',
        description: 'Use the top navigation bar to access different sections: Movements, Diary, Prospecting, Business Analytics, and more.',
        target: 'header nav',
        position: 'bottom',
      },
      {
        id: 'summary-cards',
        title: 'Summary Cards',
        description: 'These cards show your key metrics at a glance. Click "Customize Cards" to add or remove metrics.',
        target: '.summary-cards',
        position: 'bottom',
      },
      {
        id: 'filters',
        title: 'Filters & Search',
        description: 'Use filters to narrow down your data by date, branch, status, and more. The search icon lets you quickly find specific properties.',
        target: '.filter-row',
        position: 'bottom',
      },
      {
        id: 'add-movement',
        title: 'Adding Movements',
        description: 'Click "Add Movement" to create new property entries. You can add valuations, on-books properties, or B2B referrals.',
        action: 'Try clicking "Add Movement" now',
      },
    ],
  },
  {
    id: 'movements',
    title: 'Managing Movements',
    description: 'Learn how to track and update property movements through the sales pipeline',
    icon: BookOpenIcon,
    duration: '8 min',
    steps: [
      {
        id: 'movements-intro',
        title: 'Understanding Movements',
        description: 'Movements represent properties in your pipeline. Each movement has a status that tracks its progress from valuation to completion.',
      },
      {
        id: 'status-badges',
        title: 'Status Badges',
        description: 'Click any status badge to change a property\'s status. Different statuses have different forms to capture relevant information.',
        target: '.status-badge',
        position: 'top',
      },
      {
        id: 'property-details',
        title: 'Property Details',
        description: 'Click any row to view full property details, add notes, manage offers, and upload documents.',
        action: 'Click on any property to see its details',
      },
      {
        id: 'notes-offers',
        title: 'Notes & Offers',
        description: 'Use the tabs to add notes, manage offers, view history, and upload documents for each property.',
      },
      {
        id: 'map-view',
        title: 'Map View',
        description: 'Switch to map view to see your properties geographically. Each pin is color-coded by status.',
        target: 'button[title*="Map"]',
        position: 'bottom',
      },
    ],
  },
  {
    id: 'prospecting',
    title: 'Prospecting & Lead Generation',
    description: 'Master the prospecting tools to generate and convert leads',
    icon: SparklesIcon,
    duration: '6 min',
    steps: [
      {
        id: 'prospecting-intro',
        title: 'Prospecting Overview',
        description: 'Prospecting helps you track potential sellers and convert them into valuations and instructions.',
      },
      {
        id: 'prospect-stages',
        title: 'Prospect Stages',
        description: 'Prospects move through stages: Canvassed → Opportunities → Potential Seller → Valuation. Update stages by clicking the status badge.',
      },
      {
        id: 'add-prospect',
        title: 'Adding Prospects',
        description: 'Click "Add Prospect" to create new leads. Include property details, owner information, and set the hot/cold status.',
        action: 'Try adding a new prospect',
      },
      {
        id: 'book-movement',
        title: 'Booking Movements',
        description: 'When a prospect is ready, click "Add" to book a valuation. This creates a movement entry and links it to the prospect.',
      },
      {
        id: 'prospect-map',
        title: 'Prospect Map',
        description: 'Use map view to see prospects geographically. Pins are color-coded by stage to help you plan canvassing routes.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar & Diary Management',
    description: 'Organize your schedule with the integrated calendar system',
    icon: VideoIcon,
    duration: '7 min',
    steps: [
      {
        id: 'calendar-intro',
        title: 'Your Calendar',
        description: 'The calendar shows all your appointments, viewings, valuations, and tasks in one place.',
      },
      {
        id: 'calendar-views',
        title: 'Calendar Views',
        description: 'Switch between My Calendar, Main Calendar, and Branch Calendar to see different event sets.',
      },
      {
        id: 'drag-drop',
        title: 'Drag & Drop Events',
        description: 'Drag event types from the left sidebar onto time slots to quickly create appointments.',
        action: 'Try dragging "Viewings" to a time slot',
      },
      {
        id: 'valuation-feedback',
        title: 'Valuation Feedback',
        description: 'After valuations, click the event to add feedback: attended, not attended, rescheduled, or cancelled.',
      },
      {
        id: 'tasks-view',
        title: 'Tasks View',
        description: 'Switch to Tasks view to see your to-do list. Add tasks, set due dates, and check them off as you complete them.',
      },
    ],
  },
  {
    id: 'business-analytics',
    title: 'Business Analytics & Reporting',
    description: 'Understand your performance with powerful analytics tools',
    icon: BookOpenIcon,
    duration: '10 min',
    steps: [
      {
        id: 'analytics-intro',
        title: 'Business Analytics',
        description: 'Track revenue, costs, and performance across your entire business with comprehensive analytics.',
      },
      {
        id: 'revenue-cards',
        title: 'Revenue Breakdown',
        description: 'See revenue split by Sales, Legals, AML, Financial Services, Lettings, and total commission due.',
      },
      {
        id: 'league-tables',
        title: 'League Tables',
        description: 'Compare branch and staff performance with sortable league tables. See who\'s leading in sales, revenue, and conversions.',
      },
      {
        id: 'performance-summary',
        title: 'Performance Summaries',
        description: 'View detailed monthly breakdowns for branches and staff. Click cells to add color-coded ratings (green/yellow/red).',
      },
      {
        id: 'profit-loss',
        title: 'Profit & Loss',
        description: 'Access detailed P&L statements in Business Manager. Track income, expenses, and profitability by period.',
      },
    ],
  },
  {
    id: 'staff-management',
    title: 'Staff & Team Management',
    description: 'Manage your team, set targets, and track performance',
    icon: BookOpenIcon,
    duration: '9 min',
    steps: [
      {
        id: 'staff-intro',
        title: 'Staff Management',
        description: 'Manage your team members, their details, compensation, and performance all in one place.',
      },
      {
        id: 'add-staff',
        title: 'Adding Staff',
        description: 'Click "Add Staff Member" to create new team member profiles with contact details, wages, and commission structures.',
      },
      {
        id: 'staff-profile',
        title: 'Staff Profiles',
        description: 'Click "Staff Profile" to view and edit details including emergency contacts, medical information, and holiday allowance.',
      },
      {
        id: 'staff-appraisal',
        title: 'Staff Appraisals',
        description: 'Conduct formal appraisals with the appraisal form. Set targets and actuals for each month, add manager feedback.',
      },
      {
        id: 'commission-setup',
        title: 'Commission Structure',
        description: 'Set up custom commission structures for sales and lettings. Use percentage or fixed amounts for different deal types.',
      },
    ],
  },
  {
    id: 'b2b-referrals',
    title: 'B2B Referrals & Partnerships',
    description: 'Manage referrals to mortgage brokers, legal firms, and other partners',
    icon: SparklesIcon,
    duration: '5 min',
    steps: [
      {
        id: 'b2b-intro',
        title: 'B2B Referrals',
        description: 'Track referrals to mortgage brokers, legal firms, AML providers, and conveyancing services.',
      },
      {
        id: 'add-company',
        title: 'Adding B2B Partners',
        description: 'Click "Add Company" to set up new B2B partners. Define commission rates (fixed or percentage) for each partner.',
      },
      {
        id: 'send-referral',
        title: 'Sending Referrals',
        description: 'When adding a movement, select "B2B Referral" to refer a property to one of your partners. Add property address and contact details.',
      },
      {
        id: 'track-commission',
        title: 'Tracking Commission',
        description: 'B2B referrals appear in your movements table with commission amounts. Track total B2B revenue in the summary cards.',
      },
    ],
  },
];

interface TutorialOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialOverlay({ open, onOpenChange }: TutorialOverlayProps) {
  const [selectedModule, setSelectedModule] = useState<TutorialModule | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  const currentStep = selectedModule?.steps[currentStepIndex];
  const isLastStep = selectedModule && currentStepIndex === selectedModule.steps.length - 1;

  const handleNext = () => {
    if (selectedModule && currentStepIndex < selectedModule.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (isLastStep) {
      // Mark module as completed
      if (selectedModule && !completedModules.includes(selectedModule.id)) {
        setCompletedModules(prev => [...prev, selectedModule.id]);
      }
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setSelectedModule(null);
    setCurrentStepIndex(0);
  };

  const handleStartModule = (module: TutorialModule) => {
    setSelectedModule(module);
    setCurrentStepIndex(0);
  };

  const progressPercentage = selectedModule 
    ? ((currentStepIndex + 1) / selectedModule.steps.length) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto p-0">
        {!selectedModule ? (
          // Module Selection Screen
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-foreground text-2xl flex items-center gap-2">
                    <BookOpenIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                    GRIP Tutorials
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Interactive guides to help you master GRIP
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {tutorialModules.map((module) => {
                const Icon = module.icon;
                const isCompleted = completedModules.includes(module.id);

                return (
                  <Card
                    key={module.id}
                    className={cn(
                      "bg-card text-card-foreground hover:shadow-lg transition-all duration-200 cursor-pointer border-2",
                      isCompleted ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-border"
                    )}
                    onClick={() => handleStartModule(module)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-lg shrink-0",
                          isCompleted ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10"
                        )}>
                          {isCompleted ? (
                            <CheckCircle2Icon className="h-6 w-6 text-green-600" strokeWidth={1.5} />
                          ) : (
                            <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground">{module.title}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              {module.duration}
                            </span>
                            {isCompleted && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {module.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {module.steps.length} steps
                            </span>
                            {module.videoUrl && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <VideoIcon className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                                <span className="text-xs text-muted-foreground">Video included</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          // Tutorial Step Screen
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-foreground text-xl">
                    {selectedModule.title}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Step {currentStepIndex + 1} of {selectedModule.steps.length}
                  </p>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Step Content */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {currentStep?.title}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {currentStep?.description}
                </p>
                
                {currentStep?.action && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      💡 {currentStep.action}
                    </p>
                  </div>
                )}
              </div>

              {/* Screenshot/Illustration Placeholder */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-3">
                    <PlayCircleIcon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Interactive demonstration
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="gap-2"
              >
                <ChevronLeftIcon className="h-4 w-4" strokeWidth={1.5} />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {selectedModule.steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      index === currentStepIndex 
                        ? "bg-primary w-6" 
                        : index < currentStepIndex 
                        ? "bg-primary/50" 
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {isLastStep ? 'Complete' : 'Next'}
                {!isLastStep && <ChevronRightIcon className="h-4 w-4" strokeWidth={1.5} />}
                {isLastStep && <CheckCircle2Icon className="h-4 w-4" strokeWidth={1.5} />}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
