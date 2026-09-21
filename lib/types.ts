export type Stage = "applied" | "screen" | "interview" | "offer" | "hired" | "rejected";

export const STAGES: { id: Stage; label: string; tone: string }[] = [
  { id: "applied", label: "Applied", tone: "slate" },
  { id: "screen", label: "Screen", tone: "blue" },
  { id: "interview", label: "Interview", tone: "violet" },
  { id: "offer", label: "Offer", tone: "amber" },
  { id: "hired", label: "Hired", tone: "green" },
  { id: "rejected", label: "Archived", tone: "slate" },
];

export type BoardApplication = {
  id: string;
  stage: Stage;
  created_at: string;
  candidate: { id: string; full_name: string; email: string | null; linkedin_url: string | null; headline: string | null; ai_assessment: Assessment | null } | null;
  job: { id: string; title: string; location: string | null } | null;
};

export type Assessment = { score: number; summary: string; strengths: string[]; gaps: string[]; source?: "ai" | "fallback" };
