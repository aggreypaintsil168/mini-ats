export type UserRole = "admin" | "customer";
export type JobStatus = "open" | "closed" | "draft";
export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  company_name: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  customer_id: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  job_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  resume_text: string | null;
  stage: CandidateStage;
  notes: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_assessed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Minimal Database type so @supabase/ssr's generics are happy without
// pulling in the full generated-types toolchain for this MVP. If you grow
// this project, swap this for `supabase gen types typescript`.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job> };
      candidates: { Row: Candidate; Insert: Partial<Candidate>; Update: Partial<Candidate> };
    };
  };
}
