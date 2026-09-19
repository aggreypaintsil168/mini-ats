"use client";

import { useDraggable } from "@dnd-kit/core";
import { ExternalLink } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Candidate } from "@/lib/database.types";

type CandidateRow = Candidate & { jobs?: { title: string } };

export function CandidateCard({
  candidate,
  showJob,
  onClick,
  dragging,
}: {
  candidate: CandidateRow;
  showJob?: boolean;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: candidate.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "cursor-grab select-none rounded-[3px] border border-line bg-paper-raised p-2.5 active:cursor-grabbing",
        (isDragging || dragging) && "shadow-[0_6px_20px_rgba(20,24,31,0.15)] rotate-[-1deg]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal-soft text-[10px] font-semibold text-signal">
            {initials(candidate.full_name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">{candidate.full_name}</div>
            {showJob && candidate.jobs?.title && (
              <div className="truncate text-[11px] text-ink-mute">{candidate.jobs.title}</div>
            )}
          </div>
        </div>
        {candidate.linkedin_url && (
          <a
            href={candidate.linkedin_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-ink-mute hover:text-signal"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      {candidate.ai_score !== null && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn("h-full rounded-full", candidate.ai_score >= 60 ? "bg-signal" : "bg-amber")}
              style={{ width: `${candidate.ai_score}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-ink-mute">{candidate.ai_score}</span>
        </div>
      )}
    </div>
  );
}
