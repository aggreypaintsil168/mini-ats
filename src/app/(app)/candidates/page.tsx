import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions";
import { CandidatesBoard } from "@/components/candidates/candidates-board";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; job?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { as, job } = await searchParams;
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

  let jobsQuery = supabase.from("jobs").select("id, title, customer_id").order("title");
  if (effectiveCustomerId) jobsQuery = jobsQuery.eq("customer_id", effectiveCustomerId);
  const { data: jobs } = await jobsQuery;

  let candidatesQuery = supabase
    .from("candidates")
    .select("*, jobs!inner(id, title, customer_id)")
    .order("created_at", { ascending: false });

  if (effectiveCustomerId) candidatesQuery = candidatesQuery.eq("jobs.customer_id", effectiveCustomerId);

  type CandidateRow = import("@/lib/database.types").Candidate & {
    jobs: { id: string; title: string; customer_id: string };
  };
  const { data: candidates, error } = (await candidatesQuery) as unknown as {
    data: CandidateRow[] | null;
    error: { message: string } | null;
  };

  return (
    <CandidatesBoard
      candidates={candidates ?? []}
      jobs={jobs ?? []}
      error={error?.message}
      isAdmin={isAdmin}
      customers={customers}
      effectiveCustomerId={effectiveCustomerId}
      initialJobFilter={job || ""}
    />
  );
}
