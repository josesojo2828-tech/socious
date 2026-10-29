"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Eye, EyeOff, Trash2, Edit3, GripVertical, ChevronUp, ChevronDown,
} from "lucide-react";
import type { PortfolioWidget, WidgetType } from "@/features/portfolio/widgets/types";
import { widgetRegistry } from "@/features/portfolio/widgets/registry";
import { SortableWidgetItem } from "./SortableWidgetItem";

interface SortableWidgetListProps {
  widgets: PortfolioWidget[];
  selectedIndex: number | null;
  isMobile: boolean;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (id: string) => void;
}

export function SortableWidgetList({
  widgets,
  selectedIndex,
  isMobile,
  onSelect,
  onRemove,
  onReorder,
  onToggleVisibility,
}: SortableWidgetListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => widgets.map((w) => w.id), [widgets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = widgets.findIndex((w) => w.id === active.id);
    const toIndex = widgets.findIndex((w) => w.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) onReorder(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < widgets.length - 1) onReorder(index, index + 1);
  };

  if (widgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-sm font-medium text-slate-500">Tu portafolio está vacío</p>
        <p className="text-xs text-slate-400 mt-1">Agregá secciones desde el panel izquierdo</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {widgets.map((widget, index) => {
            const def = widgetRegistry[widget.type as WidgetType];
            return (
              <SortableWidgetItem
                key={widget.id}
                widget={widget}
                index={index}
                isSelected={selectedIndex === index}
                isMobile={isMobile}
                label={def.label}
                onSelect={() => onSelect(index)}
                onRemove={() => onRemove(widget.id)}
                onToggleVisibility={() => onToggleVisibility(widget.id)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                isFirst={index === 0}
                isLast={index === widgets.length - 1}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
