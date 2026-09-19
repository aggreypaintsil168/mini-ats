import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/jobs");

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return <AdminPanel accounts={accounts ?? []} />;
}
