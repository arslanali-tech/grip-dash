import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { KpiProgressCard } from './KpiProgressCard';
import { TargetFlipCard } from './TargetFlipCard';
import { cn } from '@/lib/utils';

interface DraggableKpiWrapperProps {
  id: string;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  isEditingTargets: boolean;
  kpi: any; // Can be StaffKpiData or any other KPI data structure
  onSaveTarget: (kpiId: string, newGoal: number) => void;
}

interface DragItem {
  id: string;
  index: number;
  type: string;
}

const ItemTypes = {
  CARD: 'card',
};

export function DraggableKpiWrapper({
  id,
  index,
  moveCard,
  isEditingTargets,
  kpi,
  onSaveTarget,
}: DraggableKpiWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
    accept: ItemTypes.CARD,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveCard(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations, but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: () => {
      return { id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={cn(
        'relative',
        isDragging ? 'opacity-0' : 'opacity-100', // Hide the original item while dragging
        'cursor-grab'
      )}
      data-handler-id={handlerId}
    >
      {isEditingTargets ? (
        <TargetFlipCard
          title={kpi.title}
          subtitle={kpi.subtitle}
          currentValue={kpi.currentValue}
          goal={kpi.goal}
          unit={kpi.unit}
          colorClass={kpi.progressBarColor}
          onSave={(newGoal) => onSaveTarget(kpi.id, newGoal)}
        />
      ) : (
        <KpiProgressCard
          title={kpi.title}
          subtitle={kpi.subtitle}
          currentValue={kpi.currentValue}
          goal={kpi.goal}
          unit={kpi.unit}
          progressBarColor={kpi.progressBarColor}
          statusText={kpi.statusText}
          statusColor={kpi.statusColor}
        />
      )}
    </div>
  );
}
