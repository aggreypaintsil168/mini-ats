"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { STAGES } from "@/lib/stages";
import { updateCandidateStage } from "@/lib/actions";
import type { Candidate, CandidateStage } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/kanban/column";
import { CandidateCard } from "@/components/candidates/candidate-card";
import { CandidateFormDialog } from "@/components/candidates/candidate-form-dialog";
import { CandidateDetailDialog } from "@/components/candidates/candidate-detail-dialog";

type CandidateRow = Candidate & { jobs: { id: string; title: string; customer_id: string } };
type JobOption = { id: string; title: string; customer_id: string };

export function CandidatesBoard({
  candidates,
  jobs,
  error,
  initialJobFilter,
}: {
  candidates: CandidateRow[];
  jobs: JobOption[];
  error?: string;
  isAdmin: boolean;
  customers: { id: string; full_name: string; company_name: string | null }[];
  effectiveCustomerId: string | null;
  initialJobFilter: string;
}) {
  const [rows, setRows] = useState(candidates);
  const [jobFilter, setJobFilter] = useState(initialJobFilter);
  const [nameFilter, setNameFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<CandidateRow | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<CandidateRow | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = useMemo(() => {
    return rows.filter((c) => {
      if (jobFilter && c.job_id !== jobFilter) return false;
      if (nameFilter && !c.full_name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      return true;
    });
  }, [rows, jobFilter, nameFilter]);

  const byStage = useMemo(() => {
    const map = new Map<CandidateStage, CandidateRow[]>();
    STAGES.forEach((s) => map.set(s.id, []));
    filtered.forEach((c) => map.get(c.stage)?.push(c));
    return map;
  }, [filtered]);

  function handleDragStart(event: DragStartEvent) {
    const candidate = rows.find((c) => c.id === event.active.id);
    setActiveCandidate(candidate ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCandidate(null);
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as CandidateStage;
    const candidate = rows.find((c) => c.id === active.id);
    if (!candidate || candidate.stage === newStage) return;

    setRows((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, stage: newStage } : c)));
    try {
      await updateCandidateStage(candidate.id, newStage);
    } catch (e) {
      setRows((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, stage: candidate.stage } : c)));
      toast.error(e instanceof Error ? e.message : "Couldn't move candidate");
    }
  }

  const canCreate = jobs.length > 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Candidates</h1>
          <p className="mt-1 text-sm text-ink-mute">Drag a card to move someone through the pipeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute" />
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Filter by name…"
              className="w-48 pl-8"
            />
          </div>
          <Select value={jobFilter || "__all__"} onValueChange={(v) => setJobFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All jobs</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={15} /> Add candidate
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-[3px] bg-flag-soft px-3 py-2 text-sm text-flag">{error}</p>}

      {!canCreate ? (
        <div className="rounded-[4px] border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-mute">Post a job first — candidates are attached to a job.</p>
        </div>
      ) : (
        <DndContext id="candidates-kanban" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-6 gap-3">
            {STAGES.map((stage) => (
              <KanbanColumn key={stage.id} id={stage.id} label={stage.label} count={byStage.get(stage.id)?.length ?? 0}>
                {byStage.get(stage.id)?.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    showJob={!jobFilter}
                    onClick={() => setDetailCandidate(candidate)}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeCandidate ? <CandidateCard candidate={activeCandidate} showJob={!jobFilter} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <CandidateFormDialog open={createOpen} onOpenChange={setCreateOpen} jobs={jobs} />

      {detailCandidate && (
        <CandidateDetailDialog
          candidate={detailCandidate}
          open={!!detailCandidate}
          onOpenChange={(open) => !open && setDetailCandidate(null)}
          onChange={(updated) => {
            setRows((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
            setDetailCandidate((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((c) => c.id !== id));
            setDetailCandidate(null);
          }}
        />
      )}
    </div>
  );
}
