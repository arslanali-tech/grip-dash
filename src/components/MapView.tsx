import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPinIcon } from 'lucide-react';
import { useDashboardStore, MovementStatus } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Helper to get color based on status (simplified version of statusConfig)
const getStatusColor = (status: MovementStatus) => {
  switch (status) {
    case 'offer': return 'bg-blue-500';
    case 'let-offer': return 'bg-purple-500';
    case 'on-books': return 'bg-yellow-500';
    case 'sale': return 'bg-orange-500';
    case 'let': return 'bg-cyan-500';
    case 'completed': return 'bg-purple-600';
    case 'exchanged': return 'bg-green-600';
    case 'withdrawn': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

export function MapView() {
  const { filteredMovements } = useDashboardStore();

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
        {/* Mock Map Background - Simplified representation */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                {/* Abstract shapes to look like map features */}
                <path d="M 100 100 Q 200 50 300 150 T 500 200" fill="none" stroke="gray" strokeWidth="2" />
                <path d="M 600 400 Q 500 500 400 450 T 200 500" fill="none" stroke="gray" strokeWidth="2" />
            </svg>
        </div>

        <CardContent className="p-0 h-full relative">
          {filteredMovements.map((movement) => {
            const pos = getPosition(movement.id);
            const colorClass = getStatusColor(movement.status);

            return (
              <Tooltip key={movement.id}>
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
                  <p className="font-semibold text-sm">{movement.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("w-2 h-2 rounded-full", colorClass)} />
                    <span className="text-xs capitalize">{movement.status.replace('-', ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">£{movement.price.toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border text-xs space-y-1 z-20">
            <div className="font-semibold mb-2">Status Legend</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> On Books</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Sale</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> Let</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-600"></span> Exchanged</div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
