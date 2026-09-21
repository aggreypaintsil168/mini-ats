import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/app/components/topbar";
import { Board } from "@/app/components/board";
import { CreateControls } from "@/app/components/create-modals";
import { OrganizationSwitcher } from "@/app/components/organization-switcher";
import type { BoardApplication } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <main className="page">
        <div className="alert">
          Your account has no TalentFlow profile. Complete the bootstrap step in
          the README.
        </div>
      </main>
    );
  }

  const { org } = await searchParams;
  const isAdmin = profile.role === "admin";

  const { data: organizationsData } = isAdmin
    ? await supabase
        .from("organizations")
        .select("id, name")
        .order("name")
    : {
        data: profile.organization_id
          ? [
              {
                id: profile.organization_id,
                name: "My organization",
              },
            ]
          : [],
      };

  const organizations = organizationsData ?? [];

  const organizationId = isAdmin
    ? org && organizations.some((organization) => organization.id === org)
      ? org
      : organizations[0]?.id
    : profile.organization_id;

  if (!organizationId) {
    return (
      <>
        <Topbar name={profile.full_name} role={profile.role} />

        <main className="page">
          <div className="alert">
            Create your first customer account from Accounts to begin.
          </div>
        </main>
      </>
    );
  }

  const [{ data: jobsData }, { data: applicationsData }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, department, location, status")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),

    supabase
      .from("applications")
      .select(
        `
          id,
          stage,
          created_at,
          candidate:candidates(
            id,
            full_name,
            email,
            linkedin_url,
            headline,
            ai_assessment
          ),
          job:jobs(
            id,
            title,
            location
          )
        `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  const jobs = jobsData ?? [];
  const applications = applicationsData ?? [];

  const board = applications as unknown as BoardApplication[];

  const activeJobs = jobs.filter((job) => job.status === "open");

  const currentOrganization = organizations.find(
    (organization) => organization.id === organizationId,
  );

  return (
    <div className="shell">
      <Topbar name={profile.full_name} role={profile.role} />

      <main className="page">
        <div className="title-row">
          <div>
            <div className="eyebrow">Hiring workspace</div>

            <h1>
              {isAdmin
                ? currentOrganization?.name || "Your pipeline"
                : "Your pipeline"}
            </h1>

            <p className="subtle">
              A compact, shared view of every active candidate.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isAdmin && (
              <OrganizationSwitcher
                organizations={organizations}
                current={organizationId}
              />
            )}

            <CreateControls
              jobs={activeJobs}
              organizations={organizations}
              selectedOrganizationId={organizationId}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        <div className="grid" style={{ marginBottom: 24 }}>
          <div className="panel">
            <div className="stat-label">Open roles</div>
            <div className="stat-value">{activeJobs.length}</div>
          </div>

          <div className="panel">
            <div className="stat-label">Active candidates</div>
            <div className="stat-value">
              {
                board.filter(
                  (application) =>
                    application.stage !== "rejected" &&
                    application.stage !== "hired",
                ).length
              }
            </div>
          </div>

          <div className="panel">
            <div className="stat-label">Interviews in progress</div>
            <div className="stat-value">
              {
                board.filter(
                  (application) => application.stage === "interview",
                ).length
              }
            </div>
          </div>
        </div>

        <Board applications={board} jobs={activeJobs} />

        <section id="jobs" className="panel" style={{ marginTop: 8 }}>
          <h2>Open jobs</h2>

          <p className="subtle">
            Jobs become the source of truth for the customer’s candidate funnel.
          </p>

          <div style={{ marginTop: 14 }}>
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <div className="account-row" key={job.id}>
                  <div>
                    <strong>{job.title}</strong>

                    <div className="subtle">
                      {[job.department, job.location]
                        .filter(Boolean)
                        .join(" · ") || "Details to be added"}
                    </div>
                  </div>

                  <span className="pill">OPEN</span>
                </div>
              ))
            ) : (
              <div className="empty">
                Post a job to begin adding candidates.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}