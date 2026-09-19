import "server-only";

export interface AssessInput {
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
}

export interface AssessResult {
  score: number; // 0-100
  summary: string;
  method: "claude" | "heuristic";
}

const SYSTEM_PROMPT = `You are a pragmatic technical recruiter's assistant. You screen a
candidate's resume against a single job description and give a fast, honest,
first-pass read — never a final hiring decision. Be specific and cite real
signals from the resume text (skills, years of experience, past titles).
Flag notable gaps as well as strengths. Keep it screening-speed, not a
full interview writeup.

Respond with ONLY a JSON object, no markdown fences, no preamble, in exactly
this shape:
{"score": <integer 0-100>, "summary": "<2-4 sentences>"}

Scoring guide: 80-100 strong match on core requirements; 60-79 partial match,
worth a screen; 35-59 weak match, notable gaps; 0-34 largely unrelated.`;

/**
 * Calls Claude to score a candidate's resume text against a job description.
 * Falls back to a transparent keyword-overlap heuristic if no API key is
 * configured, so the feature is demoable without any AI credentials.
 */
export async function assessCandidate(input: AssessInput): Promise<AssessResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristicAssess(input);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `JOB TITLE: ${input.jobTitle}

JOB DESCRIPTION:
${input.jobDescription || "(no description provided)"}

CANDIDATE RESUME TEXT:
${input.resumeText.slice(0, 12000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error", await response.text());
      return heuristicAssess(input);
    }

    const data = await response.json();
    const text: string = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))));
    return { score, summary: String(parsed.summary), method: "claude" };
  } catch (err) {
    console.error("assessCandidate: falling back to heuristic", err);
    return heuristicAssess(input);
  }
}

/**
 * A transparent, no-dependency stand-in for the AI call: scores by keyword
 * overlap between the job description and the resume text. It's crude on
 * purpose — it exists so the feature works end-to-end (including with a
 * real score + explanation) before any AI credentials are wired up, and so
 * the AI call has a safe fallback if the API errors at demo time.
 */
function heuristicAssess({ jobTitle, jobDescription, resumeText }: AssessInput): AssessResult {
  const stopwords = new Set([
    "the", "and", "a", "to", "of", "in", "for", "with", "on", "is", "are",
    "as", "an", "be", "will", "we", "you", "our", "this", "that", "or", "at",
  ]);
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9+.\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopwords.has(w));

  const jobTokens = new Set(tokenize(`${jobTitle} ${jobDescription}`));
  const resumeTokens = new Set(tokenize(resumeText));

  const overlap = [...jobTokens].filter((t) => resumeTokens.has(t));
  const ratio = jobTokens.size ? overlap.length / jobTokens.size : 0;
  const score = Math.round(Math.min(96, Math.max(8, ratio * 100 + resumeText.length / 400)));

  const topMatches = overlap.slice(0, 8).join(", ") || "no strong keyword overlap";
  const summary = `Heuristic pass (no ANTHROPIC_API_KEY configured, so this is keyword overlap, not a real AI read): ${overlap.length} of ${jobTokens.size} job-description terms appear in the résumé (${topMatches}). Set ANTHROPIC_API_KEY to switch this to a real Claude-based assessment.`;

  return { score, summary, method: "heuristic" };
}
