import { db } from "@/db";
import { resumes } from "@/db/schema";
import { runEngine } from "@/lib/llm";
import { emptyCandidate } from "@/lib/format";
import { analyzeJobDescription } from "@/lib/engine";
import type { Candidate, GenerateRequest } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawResume = clean(body.rawResume, 20000);
  const jobDescription = clean(body.jobDescription, 15000);
  if (rawResume.length < 40) return Response.json({ error: "Please paste your resume or career details (at least a few lines)." }, { status: 400 });
  if (jobDescription.length < 30) return Response.json({ error: "Please paste the target job description." }, { status: 400 });

  const c = body.candidate ?? {};
  const candidate: Candidate = {
    name: clean(c.name, 120) || emptyCandidate.name,
    email: clean(c.email, 120),
    phone: clean(c.phone, 60),
    location: clean(c.location, 120),
    links: clean(c.links, 240),
  };

  // When the Java Spring Boot backend is configured, delegate to it.
  const javaBackend = process.env.JAVA_BACKEND_URL?.replace(/\/$/, "");
  if (javaBackend) {
    try {
      const upstream = await fetch(`${javaBackend}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawResume, jobDescription, candidate }),
      });
      const payload = await upstream.json();
      return Response.json(payload, { status: upstream.status });
    } catch {
      // Fall through to the built-in TypeScript engine.
    }
  }

  const { output, engine } = await runEngine(rawResume, jobDescription);
  const jd = analyzeJobDescription(jobDescription);
  const title = jd.title || output.resume_content.work_experience[0]?.role || "Tailored resume";

  let id: number | null = null;
  try {
    const [row] = await db
      .insert(resumes)
      .values({
        title: title.slice(0, 120),
        engine,
        overallScore: output.ats_score.overall,
        candidate,
        rawInput: rawResume,
        jobDescription,
        result: output,
      })
      .returning({ id: resumes.id });
    id = row.id;
  } catch {
    // Saving is best-effort; still return the generated resume.
  }

  return Response.json({ id, title, engine, candidate, result: output });
}
