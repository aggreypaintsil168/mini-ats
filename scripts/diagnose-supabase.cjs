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
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const result = {
    urlHost: "",
    health: "",
    restProfiles: "",
    authUsers: "",
    profileCount: null,
    orgCount: null,
  };

  try {
    result.urlHost = new URL(url).host;
  } catch {
    result.urlHost = "invalid";
  }

  try {
    const health = await fetch(url.replace(/\/$/, "") + "/auth/v1/health", {
      headers: { apikey: anon, Authorization: "Bearer " + anon },
    });
    result.health = health.status + " " + (await health.text()).slice(0, 180);
  } catch (error) {
    result.health = "network: " + error.message;
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

  const profiles = await admin.from("profiles").select("id", { count: "exact", head: true });
  result.restProfiles = profiles.error ? profiles.error.message : "ok";
  result.profileCount = profiles.count;

  const orgs = await admin.from("organizations").select("id", { count: "exact", head: true });
  result.orgCount = orgs.error ? orgs.error.message : orgs.count;

  const users = await admin.auth.admin.listUsers();
  result.authUsers = users.error ? users.error.message : String((users.data.users || []).length);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("fatal: " + (error.message || error));
  process.exit(1);
});
