import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client, scoped to the signed-in user via their auth cookie.
// All reads/writes through this client are still subject to Row Level
// Security — it never bypasses it.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context to
            // write to — safe to ignore because middleware refreshes
            // the session on every request anyway.
          }
        },
      },
    }
  );
}
