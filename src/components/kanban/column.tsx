"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[60vh] flex-col rounded-[4px] border border-line bg-paper-raised/60 transition-colors",
        isOver && "border-signal bg-signal-soft/40"
      )}
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-[12px] font-semibold text-ink">{label}</span>
        <span className="rounded-[3px] bg-black/[0.04] px-1.5 py-0.5 text-[11px] text-ink-mute">{count}</span>
      </div>
      <div className="thin-scroll flex-1 space-y-2 overflow-y-auto p-2">
        {children}
        {count === 0 && <div className="pt-6 text-center text-[12px] text-ink-mute/70">Empty</div>}
      </div>
    </div>
  );
}
