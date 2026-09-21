import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Creates the first admin profile + demo org when none exist yet. */
export async function bootstrapFirstAdmin(user: User) {
  const admin = adminClient();
  if (!admin) return { ok: false as const, reason: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local, then refresh this page." };

  const { data: existing, error: existingError } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existingError) return { ok: false as const, reason: existingError.message };
  if (existing) return { ok: true as const };

  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) return { ok: false as const, reason: listError.message };

  const { data: profiles, error: profilesError } = await admin.from("profiles").select("id, role");
  if (profilesError) return { ok: false as const, reason: profilesError.message };

  const authIds = new Set((list.users || []).map((entry) => entry.id));
  const hasValidAdmin = (profiles || []).some((profile) => profile.role === "admin" && authIds.has(profile.id));
  if (hasValidAdmin) {
    return { ok: false as const, reason: "This login has no profile. Ask an administrator to create an account for you from Accounts." };
  }

  const { data: orgs, error: orgsError } = await admin.from("organizations").select("id").limit(1);
  if (orgsError) return { ok: false as const, reason: orgsError.message };

  let organizationId = orgs?.[0]?.id;
  if (!organizationId) {
    const { data: org, error: orgError } = await admin.from("organizations").insert({ name: "TalentFlow Demo" }).select("id").single();
    if (orgError || !org) return { ok: false as const, reason: orgError?.message || "Could not create the demo organization." };
    organizationId = org.id;
  }

  const fullName = (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) || user.email?.split("@")[0] || "Admin";
  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    organization_id: organizationId,
    full_name: fullName,
    role: "admin",
  });
  if (profileError) return { ok: false as const, reason: profileError.message };
  return { ok: true as const };
}
