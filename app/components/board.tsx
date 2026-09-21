"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { assessCandidate, moveApplication } from "@/app/actions";
import { STAGES, type BoardApplication, type Stage } from "@/lib/types";

export function Board({ applications, jobs }: { applications: BoardApplication[]; jobs: { id: string; title: string }[] }) {
  const [query, setQuery] = useState(""); const [job, setJob] = useState("all"); const [pending, startTransition] = useTransition();
  const visible = useMemo(() => applications.filter((a) => (job === "all" || a.job?.id === job) && a.candidate?.full_name.toLowerCase().includes(query.toLowerCase())), [applications, job, query]);
  const nextStage = (current: Stage) => STAGES[Math.min(STAGES.findIndex((s) => s.id === current) + 1, STAGES.length - 1)].id;
  return <><div className="toolbar"><input className="input search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter candidates by name…" /><select className="select" value={job} onChange={(e) => setJob(e.target.value)}><option value="all">All open jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select><span className="subtle">{visible.length} candidates</span></div><div className="board">{STAGES.map((column) => { const cards = visible.filter((a) => a.stage === column.id); return <section className="column" key={column.id}><div className="column-head"><span>{column.label}</span><span className="count">{cards.length}</span></div><div className="dropzone">{cards.map((application) => { const candidate = application.candidate; const assessment = candidate?.ai_assessment; return <article className="card" key={application.id}><h3>{candidate?.full_name || "Unknown candidate"}</h3><p>{candidate?.headline || candidate?.email || "No profile details yet"}</p>{application.job && <span className="job-tag">{application.job.title}</span>}<div className="card-bottom">{assessment ? <span className="score">AI match {assessment.score}%</span> : <button className="move" title="Assess CV" disabled={pending} onClick={() => candidate && startTransition(() => assessCandidate(candidate.id))}><Sparkles size={12} /></button>}{column.id !== "hired" && <button className="move" disabled={pending} onClick={() => startTransition(() => moveApplication(application.id, nextStage(application.stage)))}>Move <ChevronRight size={12} /></button>}</div></article>; })}{!cards.length && <div className="empty">No candidates here</div>}</div></section>; })}</div></>;
}
