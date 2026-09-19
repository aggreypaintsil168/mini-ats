import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions";
import { redirect } from "next/navigation";
import { JobsBoard } from "@/components/jobs/jobs-board";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { as } = await searchParams;
  const isAdmin = profile.role === "admin";
  const effectiveCustomerId = isAdmin ? as || null : profile.id;

  const supabase = await createClient();

  let customers: { id: string; full_name: string; company_name: string | null }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, company_name")
      .eq("role", "customer")
      .order("company_name");
    customers = data ?? [];
  }

  const selectCols = "*, profiles!jobs_customer_id_fkey(full_name, company_name)";
  let query = supabase.from("jobs").select(selectCols).order("created_at", { ascending: false });
  if (effectiveCustomerId) query = query.eq("customer_id", effectiveCustomerId);

  type JobRow = import("@/lib/database.types").Job & {
    profiles: { full_name: string; company_name: string | null } | null;
  };
  const { data: jobs, error } = (await query) as unknown as {
    data: JobRow[] | null;
    error: { message: string } | null;
  };

  // Candidate counts per job, for the compact list view.
  const { data: counts } = await supabase.from("candidates").select("job_id");
  const countByJob = new Map<string, number>();
  (counts ?? []).forEach((c) => countByJob.set(c.job_id, (countByJob.get(c.job_id) ?? 0) + 1));

  return (
    <JobsBoard
      jobs={jobs ?? []}
      error={error?.message}
      isAdmin={isAdmin}
      customers={customers}
      effectiveCustomerId={effectiveCustomerId}
      countByJob={Object.fromEntries(countByJob)}
    />
  );
}
