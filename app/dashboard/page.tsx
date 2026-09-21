import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { bootstrapFirstAdmin } from "@/lib/bootstrap";
import { Topbar } from "@/app/components/topbar";
import { Board } from "@/app/components/board";
import { CreateControls } from "@/app/components/create-modals";
import { OrganizationSwitcher } from "@/app/components/organization-switcher";
import type { BoardApplication } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("organization_id, role, full_name").eq("id", user.id).single();
  if (!profile) {
    const setup = await bootstrapFirstAdmin(user);
    if (setup.ok) redirect("/dashboard");
    return <main className="page"><div className="alert">{setup.reason}</div></main>;
  }
  const { org } = await searchParams; const isAdmin = profile.role === "admin"; const { data: organizations = [] } = isAdmin ? await supabase.from("organizations").select("id,name").order("name") : { data: profile.organization_id ? [{ id: profile.organization_id, name: "My organization" }] : [] };
  const organizationId = isAdmin ? (org && organizations.some((o) => o.id === org) ? org : organizations[0]?.id) : profile.organization_id;
  if (!organizationId) return <><Topbar name={profile.full_name} role={profile.role} /><main className="page"><div className="alert">Create your first customer account from Accounts to begin.</div></main></>;
  const [{ data: jobs = [] }, { data: applications = [] }] = await Promise.all([supabase.from("jobs").select("id,title,department,location,status").eq("organization_id", organizationId).order("created_at", { ascending: false }), supabase.from("applications").select("id,stage,created_at,candidate:candidates(id,full_name,email,linkedin_url,headline,ai_assessment),job:jobs(id,title,location)").eq("organization_id", organizationId).order("created_at", { ascending: false })]);
  const board = applications as unknown as BoardApplication[]; const active = jobs.filter((j) => j.status === "open");
  return <div className="shell"><Topbar name={profile.full_name} role={profile.role} /><main className="page"><div className="title-row"><div><div className="eyebrow">Hiring workspace</div><h1>{isAdmin && organizations.find((o) => o.id === organizationId)?.name || "Your pipeline"}</h1><p className="subtle">A compact, shared view of every active candidate.</p></div><div style={{display:"flex",gap:8,alignItems:"center"}}>{isAdmin && <OrganizationSwitcher organizations={organizations} current={organizationId} />}<CreateControls jobs={active} organizations={organizations} selectedOrganizationId={organizationId} isAdmin={isAdmin} /></div></div><div className="grid" style={{marginBottom:24}}><div className="panel"><div className="stat-label">Open roles</div><div className="stat-value">{active.length}</div></div><div className="panel"><div className="stat-label">Active candidates</div><div className="stat-value">{board.filter((a) => a.stage !== "rejected" && a.stage !== "hired").length}</div></div><div className="panel"><div className="stat-label">Interviews in progress</div><div className="stat-value">{board.filter((a) => a.stage === "interview").length}</div></div></div><Board applications={board} jobs={active} /><section id="jobs" className="panel" style={{marginTop:8}}><h2>Open jobs</h2><p className="subtle">Jobs become the source of truth for the customer’s candidate funnel.</p><div style={{marginTop:14}}>{active.length ? active.map((job) => <div className="account-row" key={job.id}><div><strong>{job.title}</strong><div className="subtle">{[job.department, job.location].filter(Boolean).join(" · ") || "Details to be added"}</div></div><span className="pill">OPEN</span></div>) : <div className="empty">Post a job to begin adding candidates.</div>}</div></section></main></div>;
}
