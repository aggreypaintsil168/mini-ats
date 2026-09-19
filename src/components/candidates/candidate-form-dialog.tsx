"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createCandidate } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function CandidateFormDialog({
  open,
  onOpenChange,
  jobs,
  defaultJobId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: { id: string; title: string }[];
  defaultJobId?: string;
}) {
  const [pending, setPending] = useState(false);
  const [jobId, setJobId] = useState(defaultJobId || jobs[0]?.id || "");

  async function handleSubmit(formData: FormData) {
    formData.set("job_id", jobId);
    if (!jobId) {
      toast.error("Choose which job this candidate is applying for.");
      return;
    }
    setPending(true);
    try {
      await createCandidate(formData);
      toast.success("Candidate added");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add candidate");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a candidate</DialogTitle>
          <DialogDescription>They'll land in the "Applied" column.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" required placeholder="Ama Owusu" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="ama@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+233 …" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resume_text">Résumé text</Label>
            <Textarea
              id="resume_text"
              name="resume_text"
              rows={5}
              placeholder="Paste the résumé text here — used for the AI CV assessment."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Optional recruiter notes" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="signal" disabled={pending}>
              {pending ? "Adding…" : "Add candidate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
