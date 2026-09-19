"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobFormDialog } from "@/components/jobs/job-form-dialog";
import { deleteJob, updateJobStatus } from "@/lib/actions";
import type { Job, JobStatus } from "@/lib/database.types";
import { toast } from "sonner";

type JobRow = Job & { profiles?: { full_name: string; company_name: string | null } | null };

export function JobsBoard({
  jobs,
  error,
  isAdmin,
  customers,
  effectiveCustomerId,
  countByJob,
}: {
  jobs: JobRow[];
  error?: string;
  isAdmin: boolean;
  customers: { id: string; full_name: string; company_name: string | null }[];
  effectiveCustomerId: string | null;
  countByJob: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const showCustomerColumn = isAdmin && !effectiveCustomerId;
  const canCreate = !isAdmin || !!effectiveCustomerId || customers.length > 0;

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This also removes its candidates.`)) return;
    try {
      await deleteJob(id);
      toast.success("Job deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete job");
    }
  }

  async function handleStatus(id: string, status: JobStatus) {
    try {
      await updateJobStatus(id, status);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update status");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Jobs</h1>
          <p className="mt-1 text-sm text-ink-mute">
            {showCustomerColumn
              ? "Every open requisition across all customers."
              : "Requisitions you're recruiting for."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={15} /> New job
          </Button>
        )}
      </div>

      {error && <p className="mb-4 rounded-[3px] bg-flag-soft px-3 py-2 text-sm text-flag">{error}</p>}

      {jobs.length === 0 ? (
        <div className="rounded-[4px] border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-mute">
            {effectiveCustomerId || !isAdmin
              ? "No jobs yet. Post your first requisition to start collecting candidates."
              : "No jobs anywhere yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[4px] border border-line bg-paper-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-mute">
                <th className="px-4 py-2.5 font-medium">Role</th>
                {showCustomerColumn && <th className="px-4 py-2.5 font-medium">Customer</th>}
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Candidates</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-line last:border-0 hover:bg-black/[0.015]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{job.title}</div>
                    {job.department && (
                      <div className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-mute">
                        <Building2 size={11} /> {job.department}
                      </div>
                    )}
                  </td>
                  {showCustomerColumn && (
                    <td className="px-4 py-3 text-ink-mute">
                      {job.profiles?.company_name || job.profiles?.full_name || "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-ink-mute">
                    {job.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} /> {job.location}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/candidates?job=${job.id}${effectiveCustomerId ? `&as=${effectiveCustomerId}` : ""}`}
                      className="text-signal hover:underline"
                    >
                      {countByJob[job.id] ?? 0}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatus(job.id, e.target.value as JobStatus)}
                      className={`cursor-pointer rounded-[3px] border-0 px-1.5 py-0.5 text-[11px] font-medium outline-none ${
                        job.status === "open"
                          ? "bg-signal-soft text-signal"
                          : job.status === "draft"
                          ? "bg-amber-soft text-amber"
                          : "bg-black/[0.04] text-ink-mute"
                      }`}
                    >
                      <option value="open">Open</option>
                      <option value="draft">Draft</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id, job.title)}>
                      <Trash2 size={14} className="text-ink-mute hover:text-flag" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <JobFormDialog
        open={open}
        onOpenChange={setOpen}
        customers={customers}
        effectiveCustomerId={effectiveCustomerId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
