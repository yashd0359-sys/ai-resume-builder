import type { AtsScore } from "@/lib/types";

function tone(pct: number) {
  if (pct >= 80) return { stroke: "#10b981", text: "text-emerald-600", bar: "bg-emerald-500", label: "Excellent" };
  if (pct >= 60) return { stroke: "#f59e0b", text: "text-amber-600", bar: "bg-amber-500", label: "Good — room to grow" };
  return { stroke: "#ef4444", text: "text-red-600", bar: "bg-red-500", label: "Needs work" };
}

export function ScoreRing({ value, size = 140 }: { value: number; size?: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const t = tone(value);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={t.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - value / 100)}
          className="ring-anim"
          style={{ ["--ring-circ" as string]: circ }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className={`text-4xl font-extrabold leading-none ${t.text}`}>{value}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">out of 100</div>
        </div>
      </div>
    </div>
  );
}

const PILLARS: { key: keyof AtsScore["breakdown"]; label: string; max: number; hint: string }[] = [
  { key: "keyword_match", label: "Keyword Match", max: 30, hint: "Hard skills & tools overlap" },
  { key: "impact_metrics", label: "Impact & Metrics", max: 30, hint: "Bullets with measurable results" },
  { key: "formatting_readability", label: "Formatting & Readability", max: 20, hint: "Parser-safe structure" },
  { key: "role_relevance", label: "Role Relevance", max: 20, hint: "Level & summary alignment" },
];

export default function ScoreCard({ score }: { score: AtsScore }) {
  const t = tone(score.overall);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <ScoreRing value={score.overall} />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">ATS Optimization Score</div>
          <div className={`mt-1 text-xl font-bold ${t.text}`}>{t.label}</div>
          <div className="mt-4 space-y-3">
            {PILLARS.map((p) => {
              const v = score.breakdown[p.key];
              return (
                <div key={p.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-700">{p.label}</span>
                    <span className="tabular-nums text-slate-500">
                      <b className="text-slate-900">{v}</b> / {p.max}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" title={p.hint}>
                    <div className={`h-full rounded-full ${tone((v / p.max) * 100).bar}`} style={{ width: `${(v / p.max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-4">
          <div className="mb-2 text-sm font-semibold text-emerald-800">✓ Strengths</div>
          <ul className="space-y-1.5 text-sm text-emerald-900/90">
            {score.feedback.strengths.map((s, i) => (
              <li key={i} className="leading-snug">• {s}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-amber-50 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-800">⚑ Gaps &amp; missing keywords</div>
          <ul className="space-y-1.5 text-sm text-amber-900/90">
            {score.feedback.gaps_or_missing_keywords.map((s, i) => (
              <li key={i} className="leading-snug">• {s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
