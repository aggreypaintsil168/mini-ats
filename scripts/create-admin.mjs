// Bootstraps the very first admin account, directly against Supabase using
// the service role key. Needed because every *other* account in this app
// is created by an admin from the /admin screen — so the first one has to
// be created from outside the app.
//
// Usage:
//   node scripts/create-admin.mjs you@company.com "a-strong-password" "Your Name"
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set
// in the environment (e.g. `export $(cat .env.local | xargs)` first, or run
// via `npx dotenv -e .env.local -- node scripts/create-admin.mjs ...`).

import { createClient } from "@supabase/supabase-js";

const [, , email, password, fullName] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password> "<full name>"');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName || "Admin", role: "admin" },
});

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

console.log(`✅ Admin account created: ${data.user.email} (id: ${data.user.id})`);
console.log("The 0001_init.sql trigger will have created a matching row in public.profiles automatically.");
