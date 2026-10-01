import type { EngineOutput } from "./types";
import { generateLocal } from "./engine";

export const SYSTEM_PROMPT = `You are the core AI engine for a premium AI Resume Builder. Your task is to take a user's raw career details, optimize them against a target job description, and generate an ATS-optimized resume along with a strict ATS Optimization Score.

OPERATIONAL RULES:
1. Do not invent entirely new jobs, dates, or degrees. You may rephrase, clarify, and better articulate existing experiences.
2. Rewrite all work experience bullet points using the Google XYZ formula: "Accomplished [X], as measured by [Y], by doing [Z]" or the CAR method (Context, Action, Result). Prioritize metric-driven achievements over passive task descriptions. Never fabricate numbers that the user did not provide or imply.
3. Optimize keyword density naturally. Seamlessly integrate high-priority hard skills, methodologies, and tools found in the target job description without keyword stuffing.
4. Maintain a professional, confident tone. Avoid generic fluff phrases like "results-driven professional" or "team player."

SCORING RUBRIC (ATS Score out of 100), evaluated on the finalized resume against the job description:
- Keyword Match (30 pts): How well hard skills, tools, and technical concepts overlap.
- Impact & Metrics (30 pts): The percentage of bullet points utilizing measurable, quantifiable results.
- Formatting & Readability (20 pts): Absence of text structures, tables, or complex syntax that trick text parsers.
- Role Relevance (20 pts): Overall alignment of experience level and summary targeting.
"overall" must equal the sum of the four breakdown values.

OUTPUT FORMAT: Return strictly a valid JSON object. No conversational text before or after the JSON. Use exactly this structure:
{
  "ats_score": {
    "overall": 85,
    "breakdown": { "keyword_match": 25, "impact_metrics": 20, "formatting_readability": 20, "role_relevance": 20 },
    "feedback": {
      "strengths": ["2-3 specific things the resume did well"],
      "gaps_or_missing_keywords": ["3-5 critical keywords from the job description that could still be improved"]
    }
  },
  "resume_content": {
    "professional_summary": "A 3-4 sentence high-impact summary tailored to the target role.",
    "skills": { "technical_skills": ["Skill 1"], "soft_skills_and_methodologies": ["Methodology 1"] },
    "work_experience": [
      { "company": "Company Name", "role": "Job Title", "duration": "Dates", "achievements": ["Optimized bullet 1", "Optimized bullet 2"] }
    ],
    "education": [ { "institution": "School Name", "degree": "Degree Earned", "graduation_year": "Year" } ]
  }
}`;

const num = (v: unknown, max: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n))) : 0;
};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v));
const strArr = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];

/** Validate and normalise untrusted model output into the strict contract. */
export function normaliseOutput(data: unknown): EngineOutput | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!d.ats_score || !d.resume_content) return null;

  const b = d.ats_score.breakdown ?? {};
  const breakdown = {
    keyword_match: num(b.keyword_match, 30),
    impact_metrics: num(b.impact_metrics, 30),
    formatting_readability: num(b.formatting_readability, 20),
    role_relevance: num(b.role_relevance, 20),
  };
  const overall = breakdown.keyword_match + breakdown.impact_metrics + breakdown.formatting_readability + breakdown.role_relevance;

  const rc = d.resume_content;
  const work = arr(rc.work_experience).map((w) => ({
    company: str(w.company),
    role: str(w.role),
    duration: str(w.duration),
    achievements: strArr(w.achievements),
  }));
  if (!str(rc.professional_summary) && !work.length) return null;

  return {
    ats_score: {
      overall,
      breakdown,
      feedback: {
        strengths: strArr(d.ats_score.feedback?.strengths).slice(0, 3),
        gaps_or_missing_keywords: strArr(d.ats_score.feedback?.gaps_or_missing_keywords).slice(0, 5),
      },
    },
    resume_content: {
      professional_summary: str(rc.professional_summary),
      skills: {
        technical_skills: strArr(rc.skills?.technical_skills),
        soft_skills_and_methodologies: strArr(rc.skills?.soft_skills_and_methodologies),
      },
      work_experience: work,
      education: arr(rc.education).map((e) => ({
        institution: str(e.institution),
        degree: str(e.degree),
        graduation_year: str(e.graduation_year),
      })),
    },
  };
}

async function callModel(rawResume: string, jobDescription: string): Promise<EngineOutput | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `[RAW_RESUME_OR_EXPERIENCE]:\n${rawResume}\n\n[TARGET_JOB_DESCRIPTION]:\n${jobDescription}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    let text: string = json?.choices?.[0]?.message?.content ?? "";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    return normaliseOutput(JSON.parse(text));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runEngine(
  rawResume: string,
  jobDescription: string
): Promise<{ output: EngineOutput; engine: "ai" | "local" }> {
  const ai = await callModel(rawResume, jobDescription);
  if (ai) return { output: ai, engine: "ai" };
  return { output: generateLocal(rawResume, jobDescription), engine: "local" };
}
