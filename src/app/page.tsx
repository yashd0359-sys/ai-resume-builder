import Link from "next/link";
import SiteHeader, { Logo } from "@/components/SiteHeader";
import { ScoreRing } from "@/components/ScoreCard";

const steps = [
  { n: "01", t: "Paste your experience", d: "Drop in your old resume, LinkedIn text or rough notes — jobs, education and skills." },
  { n: "02", t: "Add the target job", d: "Paste the job description. We extract the hard skills, tools and methodologies that matter." },
  { n: "03", t: "Get an ATS-ready resume", d: "Receive tailored bullets, a targeted summary and a strict 100-point ATS score with clear gaps." },
];

const pillars = [
  { name: "Keyword Match", pts: 30, d: "How well your hard skills, tools and technical concepts overlap with the job description.", color: "from-indigo-500 to-indigo-600" },
  { name: "Impact & Metrics", pts: 30, d: "The share of bullet points that carry measurable, quantifiable results.", color: "from-violet-500 to-violet-600" },
  { name: "Formatting & Readability", pts: 20, d: "No tables, columns or odd syntax that confuse text parsers.", color: "from-sky-500 to-sky-600" },
  { name: "Role Relevance", pts: 20, d: "Alignment of experience level and summary with the role you're targeting.", color: "from-emerald-500 to-emerald-600" },
];

const features = [
  { i: "🎯", t: "XYZ & CAR bullet rewrites", d: "Passive duties become “Accomplished X, measured by Y, by doing Z” achievements." },
  { i: "🔑", t: "Natural keyword optimization", d: "High-priority skills woven in where they're true — never keyword stuffing." },
  { i: "🛡️", t: "No invented facts", d: "Jobs, dates and degrees are never fabricated. We only sharpen what you've done." },
  { i: "📊", t: "Transparent scoring", d: "See exactly where every point comes from and which keywords are still missing." },
  { i: "🧾", t: "Parser-safe output", d: "Single-column, plain structure that Workday, Greenhouse and Lever can read." },
  { i: "💾", t: "PDF, Word & text export", d: "One-click downloads: a real PDF, an editable Word .docx, plain text or the engine JSON." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.18),transparent)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> AI resume engine + strict ATS scoring
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Beat the ATS.
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Land the interview.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-600">
                Paste your experience and a target job description. Our engine rewrites every bullet with metric-driven XYZ achievements, aligns your
                keywords, and scores the result out of 100.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/builder" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110">
                  Build my resume — free
                </Link>
                <Link href="#scoring" className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-slate-50">
                  How scoring works
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                <span>✓ No fabricated experience</span>
                <span>✓ Plain, parser-safe format</span>
                <span>✓ PDF, Word &amp; text export</span>
              </div>
            </div>

            {/* Mock score card */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-indigo-200/60 to-violet-200/60 blur-2xl" />
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="flex items-center gap-5">
                  <ScoreRing value={91} size={120} />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">ATS score</div>
                    <div className="text-lg font-bold text-emerald-600">Excellent</div>
                    <div className="mt-1 text-xs text-slate-500">Senior Full-Stack Engineer</div>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5 text-sm">
                  {[["Keyword Match", 27, 30], ["Impact & Metrics", 27, 30], ["Formatting", 20, 20], ["Role Relevance", 17, 20]].map(([l, v, m]) => (
                    <div key={l as string}>
                      <div className="flex justify-between"><span className="text-slate-600">{l}</span><span className="font-semibold">{v}/{m}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${((v as number) / (m as number)) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-[13px] leading-snug text-slate-700">
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Before → After</div>
                  <p className="text-slate-400 line-through">Responsible for improving API speed</p>
                  <p className="mt-1 font-medium">Reduced API latency by 38% by introducing Redis caching and optimizing PostgreSQL queries</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-y border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-extrabold tracking-tight">From raw experience to ready-to-send in 3 steps</h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="text-3xl font-black text-indigo-200">{s.n}</div>
                  <h3 className="mt-2 text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 text-slate-600">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scoring */}
        <section id="scoring" className="scroll-mt-20 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">A strict, transparent 100-point rubric</h2>
              <p className="mt-3 text-slate-600">No vanity scores. Your finalized resume is evaluated across four pillars against the job you&apos;re targeting.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map((p) => (
                <div key={p.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className={`inline-grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br ${p.color} text-xl font-extrabold text-white`}>{p.pts}</div>
                  <h3 className="mt-4 font-bold">{p.name}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-extrabold tracking-tight">Built for serious job seekers</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.t} className="rounded-2xl border border-slate-200 p-6 transition hover:border-indigo-300 hover:shadow-md">
                  <div className="text-2xl">{f.i}</div>
                  <h3 className="mt-3 font-bold">{f.t}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center text-white shadow-xl sm:p-14">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to see your ATS score?</h2>
            <p className="mx-auto mt-3 max-w-xl text-indigo-100">It takes under a minute. Try it with the built-in sample, or paste your own resume.</p>
            <Link href="/builder" className="mt-8 inline-block rounded-xl bg-white px-7 py-3.5 font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50">
              Open the builder →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} ResumeForge AI. Your data stays in your own database.</p>
        </div>
      </footer>
    </>
  );
}
