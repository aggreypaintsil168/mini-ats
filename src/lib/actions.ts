"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CandidateStage, JobStatus, UserRole } from "@/lib/database.types";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signIn(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/jobs");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Shared: who is logged in, and are they an admin?
// ---------------------------------------------------------------------------
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
export async function createJob(formData: FormData) {
  const supabase = await createClient();
  const customerId = String(formData.get("customer_id") || "");

  const { error } = await supabase.from("jobs").insert({
    customer_id: customerId,
    title: String(formData.get("title") || ""),
    department: String(formData.get("department") || "") || null,
    location: String(formData.get("location") || "") || null,
    description: String(formData.get("description") || "") || null,
    status: (String(formData.get("status") || "open") as JobStatus),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
  revalidatePath("/candidates");
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", jobId);
  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
  revalidatePath("/candidates");
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
export async function createCandidate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("candidates").insert({
    job_id: String(formData.get("job_id") || ""),
    full_name: String(formData.get("full_name") || ""),
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    linkedin_url: String(formData.get("linkedin_url") || "") || null,
    resume_text: String(formData.get("resume_text") || "") || null,
    notes: String(formData.get("notes") || "") || null,
    stage: "applied",
    created_by: user?.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/candidates");
}

export async function updateCandidateStage(candidateId: string, stage: CandidateStage) {
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update({ stage }).eq("id", candidateId);
  if (error) throw new Error(error.message);
  revalidatePath("/candidates");
}

export async function updateCandidateNotes(candidateId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").update({ notes }).eq("id", candidateId);
  if (error) throw new Error(error.message);
  revalidatePath("/candidates");
}

export async function deleteCandidate(candidateId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
  if (error) throw new Error(error.message);
  revalidatePath("/candidates");
}

// ---------------------------------------------------------------------------
// Admin: create accounts (customer or admin) on behalf of the platform owner
// ---------------------------------------------------------------------------
export async function createAccount(formData: FormData) {
  const requester = await getCurrentProfile();
  if (!requester || requester.role !== "admin") {
    throw new Error("Only admins can create accounts.");
  }

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "");
  const companyName = String(formData.get("company_name") || "") || null;
  const role = String(formData.get("role") || "customer") as UserRole;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, company_name: companyName, role },
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// AI CV assessment — see /api/analyze-cv for the implementation. This
// wrapper exists so client components can call it as a server action
// instead of hand-rolling a fetch().
// ---------------------------------------------------------------------------
export async function analyzeCandidate(candidateId: string) {
  const supabase = await createClient();

  const { data: candidate, error: candErr } = await supabase
    .from("candidates")
    .select("*, jobs(title, description)")
    .eq("id", candidateId)
    .single();
  if (candErr || !candidate) throw new Error(candErr?.message || "Candidate not found");

  const resumeText = candidate.resume_text;
  if (!resumeText || resumeText.trim().length < 20) {
    throw new Error("Add résumé text for this candidate before running the AI assessment.");
  }

  const job = (candidate as unknown as { jobs: { title: string; description: string | null } }).jobs;

  const { assessCandidate } = await import("@/lib/ai/assess");
  const result = await assessCandidate({
    jobTitle: job?.title || "",
    jobDescription: job?.description || "",
    resumeText,
  });

  const { error: updateErr } = await supabase
    .from("candidates")
    .update({
      ai_score: result.score,
      ai_summary: result.summary,
      ai_assessed_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  if (updateErr) throw new Error(updateErr.message);
  revalidatePath("/candidates");
  return result;
}
