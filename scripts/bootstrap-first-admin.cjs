const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { join } = require("path");

const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index === -1) continue;
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  const { data, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const users = data.users || [];
  if (!users.length) {
    console.error("No Auth users found. Create one in Supabase Authentication → Users, then rerun this script.");
    process.exit(1);
  }

  const user = users[0];
  const { data: existing, error: existingError } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    console.log("Admin profile already exists for " + (user.email || user.id));
    return;
  }

  const { data: orgs, error: orgsError } = await admin.from("organizations").select("id").limit(1);
  if (orgsError) throw orgsError;

  let organizationId = orgs && orgs[0] && orgs[0].id;
  if (!organizationId) {
    const { data: org, error: orgError } = await admin.from("organizations").insert({ name: "TalentFlow Demo" }).select("id").single();
    if (orgError || !org) throw orgError || new Error("Could not create organization");
    organizationId = org.id;
  }

  const fullName = (user.user_metadata && user.user_metadata.full_name) || (user.email && user.email.split("@")[0]) || "Admin";
  const { error: profileError } = await admin.from("profiles").insert({
    id: user.id,
    organization_id: organizationId,
    full_name: fullName,
    role: "admin",
  });
  if (profileError) throw profileError;

  console.log("Created admin profile for " + (user.email || user.id));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
