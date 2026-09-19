"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Briefcase, LayoutGrid, ShieldCheck, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, cn } from "@/lib/utils";
import type { Profile } from "@/lib/database.types";

export function AppShell({
  profile,
  customers,
  children,
}: {
  profile: Profile;
  customers: { id: string; full_name: string; company_name: string | null }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const actingAs = searchParams.get("as") ?? "";

  const isAdmin = profile.role === "admin";
  const actingCustomer = customers.find((c) => c.id === actingAs);

  function setActingAs(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "__all__") params.delete("as");
    else params.set("as", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  const navLink = (href: string, label: string, Icon: typeof Briefcase) => {
    const query = actingAs ? `?as=${actingAs}` : "";
    const active = pathname === href;
    return (
      <Link
        href={`${href}${query}`}
        className={cn(
          "flex items-center gap-2 rounded-[3px] px-3 py-1.5 text-[13px] font-medium transition-colors",
          active ? "bg-ink text-paper" : "text-ink-mute hover:bg-black/[0.04] hover:text-ink"
        )}
      >
        <Icon size={14} />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-paper-raised">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/jobs" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-ink font-serif text-sm text-paper">
                L
              </div>
              <span className="font-serif text-[17px] font-semibold text-ink">Ledger</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navLink("/jobs", "Jobs", Briefcase)}
              {navLink("/candidates", "Candidates", LayoutGrid)}
              {isAdmin && navLink("/admin", "Admin", ShieldCheck)}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Select value={actingAs || "__all__"} onValueChange={setActingAs}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Acting as…">
                    {actingAs ? `Acting as: ${actingCustomer?.company_name || actingCustomer?.full_name}` : "All customers"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All customers (overview)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2 pl-3 border-l border-line">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-soft text-[11px] font-semibold text-signal">
                {initials(profile.full_name || "?")}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-[13px] font-medium text-ink">{profile.full_name}</div>
                <div className="text-[11px] text-ink-mute capitalize">{profile.role}</div>
              </div>
              <form action={signOut}>
                <Button variant="ghost" size="icon" type="submit" title="Sign out">
                  <LogOut size={15} />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
