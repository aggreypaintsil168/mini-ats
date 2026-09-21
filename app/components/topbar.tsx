import Link from "next/link";
import { signOut } from "@/app/actions";

export function Topbar({ name, role }: { name: string | null; role: string }) {
  return <header className="topbar"><Link href="/dashboard" className="brand"><span className="brand-mark">T</span> TalentFlow</Link><nav className="nav"><Link href="/dashboard" className="active">Pipeline</Link><Link href="/dashboard#jobs">Jobs</Link>{role === "admin" && <Link href="/admin">Accounts</Link>}</nav><div className="user-chip"><span className="avatar">{(name || "U").slice(0, 1).toUpperCase()}</span><span>{name || "User"}</span><form action={signOut}><button className="btn secondary small">Sign out</button></form></div></header>;
}
