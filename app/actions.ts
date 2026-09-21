"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Assessment, Stage } from "@/lib/types";

async function actor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("organization_id, role, full_name").eq("id", user.id).single();
  if (!profile) throw new Error("Your account has not been assigned to an organization.");
  return { supabase, user, profile };
}

function string(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }

async function organizationFor(requestedOrgId?: string) {
  const { profile } = await actor();
  if (profile.role === "admin" && requestedOrgId) return requestedOrgId;
  if (!profile.organization_id) throw new Error("No organization is assigned to this account.");
  return profile.organization_id;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createJob(formData: FormData) {
  const { supabase } = await actor();
  const organization_id = await organizationFor(string(formData, "organization_id"));
  const title = string(formData, "title");
  if (!title) throw new Error("A job title is required.");
  const { error } = await supabase.from("jobs").insert({ organization_id, title, department: string(formData, "department") || null, location: string(formData, "location") || null, employment_type: string(formData, "employment_type") || null, description: string(formData, "description") || null });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createCandidate(formData: FormData) {
  const { supabase } = await actor();
  const organization_id = await organizationFor(string(formData, "organization_id"));
  const full_name = string(formData, "full_name");
  const job_id = string(formData, "job_id");
  if (!full_name || !job_id) throw new Error("Candidate name and job are required.");
  const { data: candidate, error } = await supabase.from("candidates").insert({ organization_id, full_name, email: string(formData, "email") || null, phone: string(formData, "phone") || null, linkedin_url: string(formData, "linkedin_url") || null, headline: string(formData, "headline") || null, cv_text: string(formData, "cv_text") || null }).select("id").single();
  if (error || !candidate) throw new Error(error?.message || "Could not create candidate");
  const application = await supabase.from("applications").insert({ organization_id, candidate_id: candidate.id, job_id, stage: "applied" });
  if (application.error) throw new Error(application.error.message);
  revalidatePath("/dashboard");
}

export async function moveApplication(applicationId: string, stage: Stage) {
  const { supabase } = await actor();
  const { error } = await supabase.from("applications").update({ stage }).eq("id", applicationId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

function fallbackAssessment(cvText: string, jobText: string): Assessment {
  const words = (value: string) => new Set((value.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) || []).filter((w) => w.length > 2));
  const cv = words(cvText); const job = words(jobText);
  const matched = [...job].filter((term) => cv.has(term)).slice(0, 5);
  const missing = [...job].filter((term) => !cv.has(term)).slice(0, 4);
  const score = Math.max(25, Math.min(92, 35 + matched.length * 11));
  return { score, strengths: matched.length ? matched : ["Profile captured"], gaps: missing.length ? missing : ["No obvious gaps detected"], summary: cvText ? `Profile match based on ${matched.length} overlapping job keywords. Review with a human before deciding.` : "Add CV text to generate a more useful assessment.", source: "fallback" };
}

export async function assessCandidate(candidateId: string) {
  const { supabase } = await actor();
  const { data: candidate } = await supabase.from("candidates").select("id, cv_text, headline").eq("id", candidateId).single();
  const { data: application } = await supabase.from("applications").select("job:jobs(title, description)").eq("candidate_id", candidateId).limit(1).single();
  if (!candidate || !application) throw new Error("Candidate or linked job not found.");
  const job = application.job as unknown as { title: string; description: string | null };
  const cv = candidate.cv_text || candidate.headline || "";
  const jobText = `${job.title} ${job.description || ""}`;
  let assessment = fallbackAssessment(cv, jobText);
  if (process.env.OPENAI_API_KEY && cv) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-4.1-mini", input: `Assess the candidate CV against this role. Return JSON only: {score: number 0-100, summary: string max 40 words, strengths: string[], gaps: string[]}. Do not infer protected traits. Role: ${jobText}\nCV: ${cv}` }) });
      const body = await response.json();
      const output = body.output_text?.match(/\{[\s\S]*\}/)?.[0];
      if (output) assessment = { ...JSON.parse(output), source: "ai" };
    } catch { /* keep deterministic assessment: the core workflow remains available */ }
  }
  const { error } = await supabase.from("candidates").update({ ai_assessment: assessment }).eq("id", candidateId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function createCustomerAccount(formData: FormData) {
  const { profile } = await actor();
  if (profile.role !== "admin") throw new Error("Only administrators can create accounts.");
  const email = string(formData, "email"); const password = string(formData, "password"); const organizationName = string(formData, "organization_name"); const fullName = string(formData, "full_name"); const role = string(formData, "role") === "admin" ? "admin" : "customer";
  if (!email || password.length < 8 || (role === "customer" && !organizationName)) throw new Error("Customer organization, email and an 8-character password are required.");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Set SUPABASE_SERVICE_ROLE_KEY to enable account creation.");
  const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let organizationId: string | null = null;
  if (role === "customer") {
    const { data: org, error: orgError } = await admin.from("organizations").insert({ name: organizationName }).select("id").single();
    if (orgError || !org) throw new Error(orgError?.message || "Could not create organization");
    organizationId = org.id;
  }
  const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError || !created.user) { if (organizationId) await admin.from("organizations").delete().eq("id", organizationId); throw new Error(userError?.message || "Could not create user"); }
  const { error: profileError } = await admin.from("profiles").insert({ id: created.user.id, organization_id: organizationId, full_name: fullName || null, role });
  if (profileError) throw new Error(profileError.message);
  revalidatePath("/admin");
}
