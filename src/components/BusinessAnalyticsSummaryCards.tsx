import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUpIcon, 
  PoundSterlingIcon, 
  PercentIcon, 
  UsersIcon, 
  HomeIcon, 
  BarChart2Icon,
  GripVerticalIcon,
  XIcon,
  SettingsIcon,
  PlusIcon,
  DollarSignIcon,
  BriefcaseIcon
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardStore } from '@/stores/dashboardStore';
import { fetchPnlStatement } from '@/lib/ownerApi';

interface SummaryCardData {
  id: string;
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  progress: number;
  progressColor: string;
  targetValue?: number;
  isCustom?: boolean;
}

export function BusinessAnalyticsSummaryCards() {
  const isMobile = useIsMobile();
  const { filteredMovements, filteredProspects, agencyId, clientId, selectedBranch } = useDashboardStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [pnlTotals, setPnlTotals] = useState<{ income: number; expenses: number } | null>(null);

  useEffect(() => {
    const loadPnlTotals = async () => {
      if (!agencyId) {
        setPnlTotals(null);
        return;
      }

      const scopeBase = clientId ? `client:${clientId}` : 'agency';
      const scope = selectedBranch && selectedBranch !== 'all'
        ? `${scopeBase}:branch:${selectedBranch}`
        : scopeBase;
      const year = new Date().getFullYear();

      const statement = await fetchPnlStatement(agencyId, scope, year);
      const sections = Array.isArray(statement?.data) ? statement?.data : [];
      if (!sections.length) {
        setPnlTotals(null);
        return;
      }

      const toNumber = (value: unknown): number => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (value === null || value === undefined) return 0;
        const cleaned = String(value).replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const num = Number.parseFloat(cleaned);
        return Number.isFinite(num) ? num : 0;
      };

      const sumValues = (values: unknown): number => {
        if (!Array.isArray(values)) return 0;
        return values.reduce((sum, v) => sum + toNumber(v), 0);
      };

      const sumSection = (type: 'income' | 'cost') =>
        sections
          .filter((s: any) => s?.type === type)
          .reduce((sectionSum: number, section: any) => {
            const rows = Array.isArray(section?.rows) ? section.rows : [];
            return sectionSum + rows.reduce((rowSum: number, row: any) => rowSum + sumValues(row?.values), 0);
          }, 0);

      const income = sumSection('income');
      const expenses = sumSection('cost');
      setPnlTotals({ income, expenses });
    };

    void loadPnlTotals();
  }, [agencyId, clientId, selectedBranch]);

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    // Sales metrics
    const completedSales = filteredMovements.filter(m => m.type === 'sale' && ['completed', 'exchanged', 'sale'].includes(m.status));
    const totalSalesRevenue = completedSales.reduce((sum, m) => sum + (m.feeAmount || 0), 0);
    const avgSalesRevenue = completedSales.length > 0 ? totalSalesRevenue / completedSales.length : 0;

    // Lettings metrics
    const completedLettings = filteredMovements.filter(m => m.type === 'letting' && ['let', 'completed'].includes(m.status));
    const totalLettingsRevenue = completedLettings.reduce((sum, m) => sum + (m.feeAmount || 0), 0);
    const avgLettingsRevenue = completedLettings.length > 0 ? totalLettingsRevenue / completedLettings.length : 0;

    // B2B & Referral metrics
    const b2bReferrals = filteredMovements.filter(m => 
      ['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(m.status)
    );
    const totalB2BRevenue = b2bReferrals.reduce((sum, m) => sum + (m.feeAmount || 0), 0);

    // Total metrics
    const totalDeals = completedSales.length + completedLettings.length;
    const totalRevenue = totalSalesRevenue + totalLettingsRevenue + totalB2BRevenue;
    const netProfit = pnlTotals ? pnlTotals.income - pnlTotals.expenses : totalRevenue * 0.3;
    const profitMargin = pnlTotals
      ? (pnlTotals.income > 0 ? (netProfit / pnlTotals.income) * 100 : 0)
      : (totalRevenue > 0 ? ((totalRevenue * 0.3) / totalRevenue) * 100 : 0); // Estimate 30% margin
    const avgDealValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;

    // Prospect metrics
    const totalProspects = filteredProspects.length;
    const convertedProspects = filteredProspects.filter(p => p.movementBooked).length;
    const conversionRate = totalProspects > 0 ? (convertedProspects / totalProspects) * 100 : 0;

    return {
      totalRevenue,
      totalSalesRevenue,
      totalLettingsRevenue,
      totalB2BRevenue,
      avgSalesRevenue,
      avgLettingsRevenue,
      totalDeals,
      profitMargin,
      netProfit,
      avgDealValue,
      completedSalesCount: completedSales.length,
      completedLettingsCount: completedLettings.length,
      b2bCount: b2bReferrals.length,
      totalProspects,
      convertedProspects,
      conversionRate,
    };
  }, [filteredMovements, filteredProspects, pnlTotals]);

  // default cards derived from live metrics; custom user cards stored separately
  const defaultCards: SummaryCardData[] = [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: `£${(metrics.totalRevenue / 1000000).toFixed(2)}M`,
      icon: PoundSterlingIcon,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      progress: 85,
      progressColor: 'bg-green-500',
      targetValue: 3000000,
    },
    {
      id: 'net-profit',
      title: 'Net Profit',
      value: `£${(metrics.netProfit / 1000).toFixed(0)}K`,
      icon: DollarSignIcon,
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      progress: Math.min((metrics.netProfit / 1000000) * 100, 100),
      progressColor: 'bg-primary',
      targetValue: 1000000,
    },
    {
      id: 'profit-margin',
      title: 'Profit Margin',
      value: `${metrics.profitMargin.toFixed(2)}%`,
      icon: PercentIcon,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      progress: Math.min(metrics.profitMargin, 100),
      progressColor: 'bg-purple-500',
      targetValue: 35,
    },
    {
      id: 'total-deals',
      title: 'Total Deals',
      value: `${metrics.totalDeals}`,
      icon: BriefcaseIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      progress: Math.min((metrics.totalDeals / 700) * 100, 100),
      progressColor: 'bg-blue-500',
      targetValue: 700,
    },
    {
      id: 'properties-sold',
      title: 'Properties Sold',
      value: `${metrics.completedSalesCount}`,
      icon: HomeIcon,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      progress: Math.min((metrics.completedSalesCount / 400) * 100, 100),
      progressColor: 'bg-orange-500',
      targetValue: 400,
    },
    {
      id: 'avg-deal-value',
      title: 'Avg Deal Value',
      value: `£${(metrics.avgDealValue / 1000).toFixed(1)}K`,
      icon: TrendingUpIcon,
      iconColor: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      progress: Math.min((metrics.avgDealValue / 5000) * 100, 100),
      progressColor: 'bg-cyan-500',
      targetValue: 5000,
    },
  ];

  const [customCards, setCustomCards] = useState<SummaryCardData[]>([]);

  

  const [newCardData, setNewCardData] = useState({
    title: '',
    value: '',
    target: '',
    dataSource: 'manual',
    calculationType: 'sum',
    iconType: 'chart',
    colorScheme: 'blue',
  });

  const iconOptions = {
    chart: { icon: BarChart2Icon, label: 'Chart' },
    trending: { icon: TrendingUpIcon, label: 'Trending' },
    money: { icon: PoundSterlingIcon, label: 'Money' },
    percent: { icon: PercentIcon, label: 'Percent' },
    users: { icon: UsersIcon, label: 'Users' },
    home: { icon: HomeIcon, label: 'Home' },
    briefcase: { icon: BriefcaseIcon, label: 'Briefcase' },
  };

  const colorSchemes = {
    blue: { iconColor: 'text-blue-600', bgColor: 'bg-blue-100', progressColor: 'bg-blue-500' },
    green: { iconColor: 'text-green-600', bgColor: 'bg-green-100', progressColor: 'bg-green-500' },
    purple: { iconColor: 'text-purple-600', bgColor: 'bg-purple-100', progressColor: 'bg-purple-500' },
    orange: { iconColor: 'text-orange-600', bgColor: 'bg-orange-100', progressColor: 'bg-orange-500' },
    cyan: { iconColor: 'text-cyan-600', bgColor: 'bg-cyan-100', progressColor: 'bg-cyan-500' },
    pink: { iconColor: 'text-pink-600', bgColor: 'bg-pink-100', progressColor: 'bg-pink-500' },
  };

  const handleAddCard = () => {
    if (!newCardData.title || !newCardData.value) {
      alert('Please fill in title and value');
      return;
    }

    const selectedIcon = iconOptions[newCardData.iconType as keyof typeof iconOptions];
    const selectedColors = colorSchemes[newCardData.colorScheme as keyof typeof colorSchemes];

    const newCard: SummaryCardData = {
      id: `custom-${Date.now()}`,
      title: newCardData.title,
      value: newCardData.value,
      icon: selectedIcon.icon,
      iconColor: selectedColors.iconColor,
      bgColor: selectedColors.bgColor,
      progress: 50,
      progressColor: selectedColors.progressColor,
      targetValue: parseFloat(newCardData.target) || 0,
      isCustom: true,
    };
    setCustomCards(prev => [...prev, newCard]);
    setAddCardOpen(false);
    setNewCardData({ 
      title: '', 
      value: '', 
      target: '', 
      dataSource: 'manual', 
      calculationType: 'sum',
      iconType: 'chart',
      colorScheme: 'blue',
    });
  };

  const handleDeleteCard = (id: string) => {
    setCustomCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className={cn(
          'grid gap-4',
          isMobile ? 'grid-flow-col auto-cols-[50%] overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-4 scrollbar-hide' : 'md:grid-cols-3 lg:grid-cols-6'
        )}>
          {(
            [...defaultCards, ...customCards]
          ).map((card, index) => {
            const Icon = card.icon;
            
            const percentage = card.targetValue && typeof card.value === 'string'
              ? 0
              : card.targetValue
                ? ((typeof card.value === 'number' ? card.value : parseFloat(String(card.value).replace(/[^0-9.-]+/g,""))) / card.targetValue) * 100
                : 0;
            const isOverTarget = percentage > 100;

            return (
              <div
                key={card.id}
                className={cn(
                  "relative transition-all duration-200",
                  isEditMode && card.isCustom ? "cursor-move hover:scale-105 opacity-90" : ''
                )}
              >
                {isEditMode && card.isCustom && (
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="absolute -top-2 -right-2 z-20 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className={cn(
                      'bg-card text-card-foreground h-full hover:shadow-lg transition-all duration-200 cursor-pointer',
                      isEditMode && "border-dashed border-2"
                    )}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-medium text-foreground flex items-center gap-2">
                          {isEditMode && <GripVerticalIcon className="h-3 w-3 text-muted-foreground" />}
                          {card.title}
                        </CardTitle>
                        <div className={cn("p-2 rounded-lg", card.bgColor)}>
                          <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground mb-2">{card.value}</div>
                        <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", card.progressColor)} 
                            style={{ width: `${card.progress}%` }}
                          />
                          <div 
                            className="absolute top-0 bottom-0 w-0.5 bg-black/50 dark:bg-white/50 z-10" 
                            style={{ left: '80%' }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  {!isEditMode && card.targetValue && (
                    <TooltipContent side="bottom" sideOffset={5} className="bg-popover text-popover-foreground border border-border shadow-lg p-3 z-50">
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold">Target: {typeof card.targetValue === 'number' ? card.targetValue.toLocaleString() : card.targetValue}</p>
                        <p className={cn("font-medium", isOverTarget ? "text-success" : "text-muted-foreground")}>
                          {isOverTarget ? `+${(percentage - 100).toFixed(1)}% Over Target` : `${percentage.toFixed(1)}% to Target`}
                        </p>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          {isEditMode ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setAddCardOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" /> Add Card
              </Button>
              <Button size="sm" onClick={() => setIsEditMode(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)} className="text-muted-foreground hover:text-foreground h-8 text-xs">
              <SettingsIcon className="h-3.5 w-3.5 mr-2" /> Customize Cards
            </Button>
          )}
        </div>

        <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
          <DialogContent className="sm:max-w-[550px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground text-xl">Create Custom Widget</DialogTitle>
              <p className="text-sm text-muted-foreground">Design your own stat card with custom data and styling</p>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Widget Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g., Monthly Conversions" 
                  value={newCardData.title} 
                  onChange={(e) => setNewCardData({...newCardData, title: e.target.value})} 
                  className="bg-background text-foreground" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-foreground">Current Value</Label>
                  <Input 
                    id="value" 
                    placeholder="e.g., 150 or £50,000" 
                    value={newCardData.value} 
                    onChange={(e) => setNewCardData({...newCardData, value: e.target.value})} 
                    className="bg-background text-foreground" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target" className="text-foreground">Target Value</Label>
                  <Input 
                    id="target" 
                    type="number" 
                    placeholder="e.g., 200" 
                    value={newCardData.target} 
                    onChange={(e) => setNewCardData({...newCardData, target: e.target.value})} 
                    className="bg-background text-foreground" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Icon</Label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(iconOptions).map(([key, { icon: Icon, label }]) => (
                    <button
                      key={key}
                      onClick={() => setNewCardData({...newCardData, iconType: key})}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                        newCardData.iconType === key 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Color Scheme</Label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(colorSchemes).map(([key, colors]) => (
                    <button
                      key={key}
                      onClick={() => setNewCardData({...newCardData, colorScheme: key})}
                      className={cn(
                        "h-10 rounded-lg border-2 transition-all",
                        colors.bgColor,
                        newCardData.colorScheme === key 
                          ? "border-foreground scale-110" 
                          : "border-transparent hover:scale-105"
                      )}
                      title={key}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-source" className="text-foreground">Data Source</Label>
                <select
                  id="data-source"
                  value={newCardData.dataSource}
                  onChange={(e) => setNewCardData({...newCardData, dataSource: e.target.value})}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="movements">From Movements</option>
                  <option value="prospects">From Prospects</option>
                  <option value="staff">From Staff Data</option>
                  <option value="calculated">Calculated Field</option>
                </select>
              </div>

              {newCardData.dataSource !== 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="calculation" className="text-foreground">Calculation Type</Label>
                  <select
                    id="calculation"
                    value={newCardData.calculationType}
                    onChange={(e) => setNewCardData({...newCardData, calculationType: e.target.value})}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="count">Count</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddCardOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCard} className="bg-primary text-primary-foreground hover:bg-primary/90">Create Widget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
