"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ScoreCard from "./ScoreCard";
import ResumePreview from "./ResumePreview";
import { emptyCandidate, resumeToText } from "@/lib/format";
import { downloadDocx, downloadJson, downloadPdf, downloadText } from "@/lib/exporters";
import { SAMPLE_JD, SAMPLE_RESUME } from "@/lib/sample";
import type { Candidate, EngineOutput, SavedResumeSummary } from "@/lib/types";

interface Result {
  id: number | null;
  title: string;
  engine: string;
  candidate: Candidate;
  result: EngineOutput;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

type ExportKind = "pdf" | "docx" | "txt";

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 12 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function Builder() {
  const [candidate, setCandidate] = useState<Candidate>(emptyCandidate);
  const [raw, setRaw] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [tab, setTab] = useState<"resume" | "json">("resume");
  const [history, setHistory] = useState<SavedResumeSummary[]>([]);
  const [copied, setCopied] = useState("");
  const [exporting, setExporting] = useState<ExportKind | "">("");
  const [exportError, setExportError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/resumes");
      const j = await r.json();
      setHistory(j.resumes ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  const setC = (k: keyof Candidate) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCandidate((c) => ({ ...c, [k]: e.target.value }));

  async function generate() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawResume: raw, jobDescription: jd, candidate }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong.");
      setRes(j);
      setTab("resume");
      loadHistory();
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function open(id: number) {
    const r = await fetch(`/api/resumes/${id}`);
    if (!r.ok) return;
    const { resume } = await r.json();
    setCandidate(resume.candidate);
    setRaw(resume.rawInput);
    setJd(resume.jobDescription);
    setRes({ id: resume.id, title: resume.title, engine: resume.engine, candidate: resume.candidate, result: resume.result });
    setTab("resume");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function remove(id: number) {
    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (res?.id === id) setRes(null);
    loadHistory();
  }

  async function copy(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  const json = res ? JSON.stringify(res.result, null, 2) : "";
  const text = res ? resumeToText(res.candidate, res.result.resume_content) : "";

  async function exportAs(kind: ExportKind) {
    if (!res) return;
    setExportError("");
    setExporting(kind);
    try {
      const content = res.result.resume_content;
      if (kind === "pdf") await downloadPdf(res.candidate, content);
      else if (kind === "docx") await downloadDocx(res.candidate, content);
      else downloadText(res.candidate, text);
    } catch {
      setExportError(`Could not generate the ${kind.toUpperCase()} file. Try the Print option instead.`);
    } finally {
      setExporting("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 print:hidden">
        <h1 className="text-3xl font-extrabold tracking-tight">Resume Builder</h1>
        <p className="mt-1 text-slate-600">Paste your experience and the job you want. We&apos;ll rewrite, optimize and score it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] print:hidden">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Contact (optional)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={inputCls} placeholder="Full name" value={candidate.name} onChange={setC("name")} />
              <input className={inputCls} placeholder="Email" value={candidate.email} onChange={setC("email")} />
              <input className={inputCls} placeholder="Phone" value={candidate.phone} onChange={setC("phone")} />
              <input className={inputCls} placeholder="City, State" value={candidate.location} onChange={setC("location")} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="LinkedIn / portfolio / GitHub" value={candidate.links} onChange={setC("links")} />
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">1 · Your experience</h2>
                <span className="text-xs text-slate-400">{raw.length.toLocaleString()} chars</span>
              </div>
              <textarea
                className={`${inputCls} h-80 resize-y font-mono text-[13px] leading-relaxed`}
                placeholder={"Paste your current resume or raw notes.\n\nWork Experience\nRole at Company | Jan 2020 - Present\n- What you did...\n\nEducation\n...\n\nSkills\n..."}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">2 · Target job description</h2>
                <span className="text-xs text-slate-400">{jd.length.toLocaleString()} chars</span>
              </div>
              <textarea
                className={`${inputCls} h-80 resize-y text-[13px] leading-relaxed`}
                placeholder={"Paste the full job posting.\nStart with the job title on the first line for best targeting."}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </section>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={generate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Optimizing…
                </>
              ) : (
                <>✨ Generate ATS-optimized resume</>
              )}
            </button>
            <button
              onClick={() => {
                setRaw(SAMPLE_RESUME);
                setJd(SAMPLE_JD);
                setCandidate({ name: "Jordan Rivera", email: "jordan.rivera@email.com", phone: "(512) 555-0142", location: "Austin, TX", links: "linkedin.com/in/jordanrivera" });
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Load sample data
            </button>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Saved resumes</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing yet. Generated resumes are saved here automatically.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 p-2 hover:border-indigo-300">
                  <button onClick={() => open(h.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold text-white ${
                        h.overallScore >= 80 ? "bg-emerald-500" : h.overallScore >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                    >
                      {h.overallScore}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{h.title}</span>
                      <span className="block text-xs text-slate-500">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </span>
                  </button>
                  <button onClick={() => remove(h.id)} aria-label="Delete" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {res && (
        <div ref={resultRef} className="mt-10 scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Your optimized resume</h2>
              <p className="text-sm text-slate-500">
                Target: <b className="text-slate-700">{res.title}</b> ·{" "}
                {res.engine === "ai" ? "Generated by AI model" : "Generated by built-in ATS engine"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportAs("pdf")}
                disabled={exporting !== ""}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
              >
                {exporting === "pdf" ? <Spinner /> : <IconDoc />}
                {exporting === "pdf" ? "Building PDF…" : "Download PDF"}
              </button>
              <button
                onClick={() => exportAs("docx")}
                disabled={exporting !== ""}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
              >
                {exporting === "docx" ? <Spinner /> : <IconDoc />}
                {exporting === "docx" ? "Building Word…" : "Download Word"}
              </button>
              <button
                onClick={() => exportAs("txt")}
                disabled={exporting !== ""}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Plain text
              </button>
              <button onClick={() => window.print()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Print
              </button>
              <button onClick={() => copy("text", text)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                {copied === "text" ? "Copied ✓" : "Copy"}
              </button>
            </div>
          </div>

          {exportError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{exportError}</div>
          )}
          <p className="mb-5 text-xs text-slate-500 print:hidden">
            PDF and Word exports contain real selectable text in a single column — no tables, images or text boxes — so ATS parsers can read every line.
          </p>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <div className="space-y-4 print:hidden">
              <ScoreCard score={res.result.ats_score} />
              {res.engine === "local" && (
                <p className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-relaxed text-indigo-900">
                  <b>Built-in engine mode.</b> Bullets were cleaned and strengthened without inventing facts. Add an <code>OPENAI_API_KEY</code> environment
                  variable to unlock full Google-XYZ / CAR rewrites by an LLM.
                </p>
              )}
            </div>

            <div>
              <div className="mb-3 flex gap-1 rounded-lg bg-slate-200/70 p-1 text-sm font-medium print:hidden sm:w-fit">
                {(["resume", "json"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-md px-4 py-1.5 transition ${tab === t ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    {t === "resume" ? "Resume preview" : "Engine JSON"}
                  </button>
                ))}
              </div>
              {tab === "resume" ? (
                <ResumePreview candidate={res.candidate} content={res.result.resume_content} />
              ) : (
                <div className="relative print:hidden">
                  <div className="absolute right-3 top-3 flex gap-2">
                    <button onClick={() => copy("json", json)} className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20">
                      {copied === "json" ? "Copied ✓" : "Copy"}
                    </button>
                    <button onClick={() => downloadJson(res.candidate, json)} className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20">
                      Download
                    </button>
                  </div>
                  <pre className="max-h-[720px] overflow-auto rounded-xl bg-slate-900 p-5 pt-12 text-xs leading-relaxed text-emerald-200">{json}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
