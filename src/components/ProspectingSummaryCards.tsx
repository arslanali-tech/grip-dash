import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchIcon, UserCheckIcon, TrendingUpIcon, PoundSterlingIcon, PercentIcon, CheckCircle2Icon, GripVerticalIcon, XIcon, SettingsIcon, PlusIcon } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
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

interface SummaryCardData {
  id: string;
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  progressColor: string;
  delay: string;
  isCustom?: boolean;
}

export function ProspectingSummaryCards() {
  const { filteredProspects } = useDashboardStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  
  const totalProspects = filteredProspects.length;
  const canvassed = filteredProspects.filter(p => p.stage === 'canvassed').length;
  const opportunities = filteredProspects.filter(p => p.stage === 'opportunities').length;
  const potentialSellers = filteredProspects.filter(p => p.stage === 'potential-seller').length;
  const movementsBooked = filteredProspects.filter(p => p.movementBooked).length;
  
  const averagePriceEst = filteredProspects.length > 0
    ? Math.round(filteredProspects.reduce((sum, p) => sum + p.priceEst, 0) / filteredProspects.length)
    : 0;
  
  const conversionRate = totalProspects > 0 
    ? ((movementsBooked / totalProspects) * 100).toFixed(1)
    : '0.0';
  
  const totalEstimatedValue = filteredProspects.reduce((sum, p) => sum + p.priceEst, 0);
  
  const hotProspects = filteredProspects.filter(p => p.hotCold === 'hot').length;

  const [cards, setCards] = useState<SummaryCardData[]>([
    {
      id: 'total-prospects',
      title: 'Total Prospects',
      value: totalProspects,
      icon: SearchIcon,
      iconColor: 'text-primary',
      progressColor: 'bg-primary',
      delay: '0ms',
    },
    {
      id: 'hot-prospects',
      title: 'Hot Prospects',
      value: hotProspects,
      icon: TrendingUpIcon,
      iconColor: 'text-red-600',
      progressColor: 'bg-red-600',
      delay: '100ms',
    },
    {
      id: 'movements-booked',
      title: 'Valuation Booked',
      value: movementsBooked,
      icon: CheckCircle2Icon,
      iconColor: 'text-green-600',
      progressColor: 'bg-green-600',
      delay: '200ms',
    },
    {
      id: 'avg-price-est',
      title: 'Avg. Price Est.',
      value: `£${averagePriceEst.toLocaleString()}`,
      icon: PoundSterlingIcon,
      iconColor: 'text-success',
      progressColor: 'bg-success',
      delay: '300ms',
    },
    {
      id: 'conversion-rate',
      title: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: PercentIcon,
      iconColor: 'text-purple-600',
      progressColor: 'bg-purple-600',
      delay: '400ms',
    },
    {
      id: 'total-est-value',
      title: 'Total Est. Value',
      value: `£${(totalEstimatedValue / 1000000).toFixed(2)}M`,
      icon: PoundSterlingIcon,
      iconColor: 'text-blue-600',
      progressColor: 'bg-blue-600',
      delay: '500ms',
    },
  ]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const _cards = [...cards];
      const draggedItemContent = _cards.splice(dragItem.current, 1)[0];
      _cards.splice(dragOverItem.current, 0, draggedItemContent);
      setCards(_cards);
      dragItem.current = null;
      dragOverItem.current = null;
    }
  };

  const [newCardData, setNewCardData] = useState({
    title: '',
    value: '',
  });

  const handleAddCard = () => {
    const newCard: SummaryCardData = {
      id: `custom-${Date.now()}`,
      title: newCardData.title,
      value: newCardData.value,
      icon: SearchIcon,
      iconColor: 'text-primary',
      progressColor: 'bg-primary',
      delay: '0ms',
      isCustom: true,
    };
    setCards([...cards, newCard]);
    setAddCardOpen(false);
    setNewCardData({ title: '', value: '' });
  };

  const handleDeleteCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 xl:grid xl:grid-cols-6 xl:gap-4 xl:overflow-visible xl:snap-none xl:pb-0">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                draggable={isEditMode}
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "relative transition-all duration-200",
                  "snap-center shrink-0 w-[280px] xl:w-auto xl:shrink xl:snap-none",
                  isEditMode && "cursor-move hover:scale-105 opacity-90"
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
                
                <Card
                  className={cn(
                    'bg-card text-card-foreground animate-in fade-in-50 slide-in-from-bottom-4 duration-500 hover:shadow-lg transition-all cursor-pointer border-2',
                    'w-full',
                    isEditMode && "border-dashed",
                    !isEditMode && card.progressColor.replace('bg-', 'border-')
                  )}
                  style={{ animationDelay: card.delay }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-medium text-foreground flex items-center gap-2">
                      {isEditMode && <GripVerticalIcon className="h-3 w-3 text-muted-foreground" />}
                      {card.title}
                    </CardTitle>
                    <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-semibold text-foreground mb-2">{card.value}</div>
                    <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", card.progressColor)} 
                        style={{ width: '70%' }}
                      />
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-black/50 dark:bg-white/50 z-10" 
                        style={{ left: '80%' }}
                      />
                    </div>
                  </CardContent>
                </Card>
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
          <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Custom Card</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right text-foreground">Title</Label>
                <Input id="title" value={newCardData.title} onChange={(e) => setNewCardData({...newCardData, title: e.target.value})} className="col-span-3 bg-background text-foreground" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right text-foreground">Value</Label>
                <Input id="value" value={newCardData.value} onChange={(e) => setNewCardData({...newCardData, value: e.target.value})} className="col-span-3 bg-background text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCard} className="bg-primary text-primary-foreground hover:bg-primary/90">Add Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
