"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function login(formData: FormData) {
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
    setLoading(false); if (error) return setError(error.message); router.replace("/dashboard"); router.refresh();
  }
  return <main className="login"><aside className="login-aside"><div><div className="brand"><span className="brand-mark">T</span> TalentFlow</div><h1>Make every great hire feel inevitable.</h1><p>A focused hiring workspace for teams that want less spreadsheet work and more momentum.</p></div><div className="quote">“A remarkably calm way to run a busy hiring pipeline.”<br /><strong>— Your future first customer</strong></div></aside><section className="login-form"><div className="auth-card"><div className="brand"><span className="brand-mark">T</span> TalentFlow</div><h2>Welcome back</h2><p className="subtle">Sign in to manage your hiring pipeline.</p>{error && <div className="alert">{error}</div>}<form action={login}><label className="field">Email<input className="input" name="email" type="email" required placeholder="you@company.com" /></label><label className="field">Password<input className="input" name="password" type="password" required placeholder="••••••••" /></label><button className="btn" disabled={loading}>{loading ? "Signing in…" : <>Sign in <ArrowRight size={15} /></>}</button></form><p className="subtle" style={{marginTop:22}}><Sparkles size={13} style={{verticalAlign:"-2px"}} /> Your data is isolated to your organization.</p></div></section></main>;
}
