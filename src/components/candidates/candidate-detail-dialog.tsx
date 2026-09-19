"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Mail, Phone, Sparkles, Trash2 } from "lucide-react";
import { analyzeCandidate, deleteCandidate, updateCandidateNotes, updateCandidateStage } from "@/lib/actions";
import { STAGES } from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, initials } from "@/lib/utils";
import type { Candidate, CandidateStage } from "@/lib/database.types";

type CandidateRow = Candidate & { jobs?: { title: string } };

export function CandidateDetailDialog({
  candidate,
  open,
  onOpenChange,
  onChange,
  onDeleted,
}: {
  candidate: CandidateRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (updated: Partial<Candidate> & { id: string }) => void;
  onDeleted: (id: string) => void;
}) {
  const [notes, setNotes] = useState(candidate.notes || "");
  const [analyzing, setAnalyzing] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  async function handleStage(stage: CandidateStage) {
    onChange({ id: candidate.id, stage });
    try {
      await updateCandidateStage(candidate.id, stage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update stage");
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await updateCandidateNotes(candidate.id, notes);
      onChange({ id: candidate.id, notes });
      toast.success("Notes saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await analyzeCandidate(candidate.id);
      onChange({ id: candidate.id, ai_score: result.score, ai_summary: result.summary });
      toast.success(`Scored ${result.score}/100`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't run assessment");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${candidate.full_name} from this pipeline?`)) return;
    try {
      await deleteCandidate(candidate.id);
      onDeleted(candidate.id);
      toast.success("Candidate removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove candidate");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-soft text-sm font-semibold text-signal">
              {initials(candidate.full_name)}
            </div>
            <div>
              <DialogTitle>{candidate.full_name}</DialogTitle>
              {candidate.jobs?.title && <p className="text-[13px] text-ink-mute">{candidate.jobs.title}</p>}
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 text-[13px] text-ink-mute">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-ink">
              <Mail size={13} /> {candidate.email}
            </a>
          )}
          {candidate.phone && (
            <span className="flex items-center gap-1">
              <Phone size={13} /> {candidate.phone}
            </span>
          )}
          {candidate.linkedin_url && (
            <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-signal">
              <ExternalLink size={13} /> LinkedIn profile
            </a>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <Label>Stage</Label>
          <Select value={candidate.stage} onValueChange={(v) => handleStage(v as CandidateStage)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 rounded-[4px] border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Sparkles size={14} className="text-signal" /> AI CV assessment
            </div>
            <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing…" : candidate.ai_score !== null ? "Re-run" : "Run assessment"}
            </Button>
          </div>
          {candidate.ai_score !== null ? (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className={cn("h-full rounded-full", candidate.ai_score >= 60 ? "bg-signal" : "bg-amber")}
                    style={{ width: `${candidate.ai_score}%` }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-ink">{candidate.ai_score}/100</span>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-mute">{candidate.ai_summary}</p>
            </div>
          ) : (
            <p className="text-[13px] text-ink-mute">
              Not assessed yet. Make sure résumé text is on file, then run the assessment against this job's
              description.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="notes">Recruiter notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>

        <div className="mt-2 flex justify-end border-t border-line pt-3">
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 size={13} /> Remove candidate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
