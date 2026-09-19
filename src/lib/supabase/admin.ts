import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// DANGER: this client uses the Supabase *service role* key, which bypasses
// Row Level Security entirely. It must never be imported into any file
// that ships to the browser (the `server-only` import above will throw a
// build error if that ever happens by mistake).
//
// It exists for exactly one job in this app: letting an admin create new
// auth accounts (customer or admin) from the /admin screen, which requires
// Supabase's admin-only `auth.admin.createUser` API.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
