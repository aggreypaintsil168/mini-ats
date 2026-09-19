"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { CreateAccountDialog } from "@/components/admin/create-account-dialog";
import type { Profile } from "@/lib/database.types";

export function AdminPanel({ accounts }: { accounts: Profile[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Admin</h1>
          <p className="mt-1 text-sm text-ink-mute">Create and manage customer and admin accounts.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} /> New account
        </Button>
      </div>

      <div className="overflow-hidden rounded-[4px] border border-line bg-paper-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-ink-mute">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-soft text-[10px] font-semibold text-signal">
                      {initials(a.full_name || "?")}
                    </div>
                    <span className="font-medium text-ink">{a.full_name || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-mute">{a.company_name || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.role === "admin" ? "amber" : "signal"}>
                    {a.role === "admin" && <ShieldCheck size={11} className="mr-1 inline" />}
                    {a.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-ink-mute">{new Date(a.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateAccountDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
