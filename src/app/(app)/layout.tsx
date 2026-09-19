import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  let customers: { id: string; full_name: string; company_name: string | null }[] = [];
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, company_name")
      .eq("role", "customer")
      .order("company_name");
    customers = data ?? [];
  }

  return (
    <AppShell profile={profile} customers={customers}>
      {children}
    </AppShell>
  );
}
