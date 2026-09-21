"use client";

import { useRouter } from "next/navigation";

export function OrganizationSwitcher({ organizations, current }: { organizations: { id: string; name: string }[]; current: string }) {
  const router = useRouter();
  if (organizations.length < 2) return null;
  return <select aria-label="Switch customer account" className="select" value={current} onChange={(event) => router.push(`/dashboard?org=${event.target.value}`)}>{organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select>;
}
