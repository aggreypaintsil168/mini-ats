"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createJob } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function JobFormDialog({
  open,
  onOpenChange,
  customers,
  effectiveCustomerId,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: { id: string; full_name: string; company_name: string | null }[];
  effectiveCustomerId: string | null;
  isAdmin: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [customerId, setCustomerId] = useState(effectiveCustomerId || "");
  const needsCustomerPicker = isAdmin && !effectiveCustomerId;

  async function handleSubmit(formData: FormData) {
    if (needsCustomerPicker && !customerId) {
      toast.error("Choose which customer this job belongs to.");
      return;
    }
    formData.set("customer_id", effectiveCustomerId || customerId);
    setPending(true);
    try {
      await createJob(formData);
      toast.success("Job posted");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create job");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a job</DialogTitle>
          <DialogDescription>This creates a new pipeline you can attach candidates to.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {needsCustomerPicker && (
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title</Label>
            <Input id="title" name="title" required placeholder="Senior Backend Engineer" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" placeholder="Engineering" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Remote / Accra" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              placeholder="Responsibilities, requirements, nice-to-haves…"
            />
            <p className="text-[12px] text-ink-mute">Used as context for the AI CV assessment.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="signal" disabled={pending}>
              {pending ? "Posting…" : "Post job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
