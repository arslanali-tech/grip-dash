import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPinIcon } from 'lucide-react';
import { useDashboardStore, ProspectingStatus } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Helper to get color based on prospecting stage
const getStageColor = (stage: ProspectingStatus) => {
  switch (stage) {
    case 'canvassed': return 'bg-indigo-600';
    case 'not-available': return 'bg-gray-500';
    case 'opportunities': return 'bg-amber-500';
    case 'potential-seller': return 'bg-fuchsia-600';
    case 'sold-oa': return 'bg-rose-600';
    case 'valuation': return 'bg-emerald-600';
    default: return 'bg-gray-400';
  }
};

const getStageLabel = (stage: ProspectingStatus) => {
  switch (stage) {
    case 'canvassed': return 'Canvassed';
    case 'not-available': return 'Not Available';
    case 'opportunities': return 'Opportunities';
    case 'potential-seller': return 'Potential Seller';
    case 'sold-oa': return 'Sold OA';
    case 'valuation': return 'Valuation';
    default: return stage;
  }
};

export function ProspectingMapView() {
  const { filteredProspects } = useDashboardStore();

  // Generate deterministic "random" positions based on ID to keep pins stable
  const getPosition = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const top = (hash * 13) % 80 + 10; // 10% to 90%
    const left = (hash * 29) % 80 + 10; // 10% to 90%
    return { top: `${top}%`, left: `${left}%` };
  };

  return (
    <TooltipProvider>
      <Card className="h-[600px] w-full overflow-hidden border-2 border-border relative bg-[#e5e7eb]">
        {/* Mock Map Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <path d="M 100 100 Q 200 50 300 150 T 500 200" fill="none" stroke="gray" strokeWidth="2" />
            <path d="M 600 400 Q 500 500 400 450 T 200 500" fill="none" stroke="gray" strokeWidth="2" />
          </svg>
        </div>

        <CardContent className="p-0 h-full relative">
          {filteredProspects.map((prospect) => {
            const pos = getPosition(prospect.id);
            const colorClass = getStageColor(prospect.stage);

            return (
              <Tooltip key={prospect.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute w-4 h-4 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform z-10",
                      colorClass
                    )}
                    style={{ top: pos.top, left: pos.left }}
                  />
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-lg p-2">
                  <p className="font-semibold text-sm">{prospect.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("w-2 h-2 rounded-full", colorClass)} />
                    <span className="text-xs capitalize">{getStageLabel(prospect.stage)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">£{prospect.priceEst.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {prospect.hotCold === 'hot' && <span className="text-red-500 font-semibold">Hot</span>}
                    {prospect.hotCold === 'cold' && <span className="text-blue-500">Cold</span>}
                    {prospect.hotCold === 'incomplete' && <span className="text-gray-500">Incomplete</span>}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border text-xs space-y-1 z-20">
            <div className="font-semibold mb-2">Stage Legend</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> Canvassed</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-600"></span> Valuation</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-fuchsia-600"></span> Potential Seller</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-600"></span> Sold OA</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Not Available</div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
