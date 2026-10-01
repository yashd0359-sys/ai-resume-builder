import type { EngineOutput, Education, ResumeContent, WorkExperience } from "./types";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const TECH_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Golang", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala",
  "SQL", "NoSQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
  "React", "Next.js", "Node.js", "Angular", "Vue", "Django", "Flask", "FastAPI", "Spring Boot", ".NET", "Express",
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "CI/CD", "Jenkins", "Git", "GitHub Actions",
  "GraphQL", "REST APIs", "Microservices", "API Design", "System Design", "Distributed Systems",
  "Machine Learning", "Deep Learning", "NLP", "LLMs", "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy",
  "Tableau", "Power BI", "Excel", "Looker", "Snowflake", "Spark", "Kafka", "Airflow", "dbt", "ETL", "Data Analysis",
  "Data Modeling", "Data Visualization", "Statistics", "A/B Testing",
  "SEO", "SEM", "Google Analytics", "HubSpot", "Salesforce", "CRM", "Content Marketing", "Email Marketing",
  "Lead Generation", "Figma", "Sketch", "UX Research", "User Research", "Wireframing", "Prototyping",
  "Jira", "Product Roadmap", "Budgeting", "Forecasting", "Financial Modeling", "GAAP", "P&L", "QuickBooks", "SAP", "ERP",
  "Supply Chain", "Logistics", "Recruiting", "Talent Acquisition", "HRIS", "Compliance", "Risk Management",
  "HTML", "CSS", "Tailwind CSS", "Sass", "Webpack", "Jest", "Cypress", "Selenium", "Linux", "Bash", "DevOps", "SRE",
  "Datadog", "Prometheus", "Grafana", "OAuth", "Security", "React Native", "Flutter", "iOS", "Android",
  "Customer Success", "Account Management", "Negotiation",
];

const SOFT_AND_METHODS = [
  "Agile", "Scrum", "Kanban", "Lean", "Six Sigma", "OKRs", "KPIs", "TDD", "Stakeholder Management", "Project Management",
  "Cross-functional Collaboration", "Leadership", "Mentoring", "Communication", "Problem Solving", "Strategic Planning",
  "Code Review", "Process Improvement", "Change Management", "Public Speaking", "Time Management",
];

const ALL_TERMS = [...TECH_SKILLS, ...SOFT_AND_METHODS];
const SOFT_SET = new Set(SOFT_AND_METHODS.map((s) => s.toLowerCase()));

const STOP = new Set(
  `a about above after again all also an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up us very was we were what when where which while who whom why will with would you your
  experience experienced years year work working ability strong skills skill team teams role roles job company candidate candidates required requirements preferred responsibilities responsibility including include plus must will good great excellent proven demonstrated knowledge understanding looking join opportunity position seeking environment business new using use used well etc across within ensure support help build develop develops related equivalent degree bachelor master benefits salary apply about love every make like need needs able high highly day days people part full time based key best our etc`
    .split(/\s+/)
);

const TITLE_RE =
  /\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|director|lead|coordinator|administrator|scientist|associate|intern|officer|executive|assistant|representative|technician|programmer|strategist|marketer|accountant|recruiter|producer|editor|writer|teacher|nurse|head|vp|president|founder|owner|supervisor|researcher)\b/i;

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_RE = new RegExp(
  `((?:${MONTH}\\s+)?(?:19|20)\\d{2})\\s*(?:-|–|—|to)\\s*(present|current|now|(?:${MONTH}\\s+)?(?:19|20)\\d{2})`,
  "i"
);

const DEGREE_RE =
  /\b(bachelor|master|doctor|ph\.?d|mba|b\.?\s?sc?\.?|m\.?\s?sc?\.?|b\.?\s?tech|m\.?\s?tech|b\.?a\.?|m\.?a\.?|b\.?eng|associate|diploma|certificate|licentiate)\b/i;
const INST_RE = /\b(university|college|institute|school|academy|polytechnic|universit[éy]|iit|mit)\b/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

function hasTerm(text: string, term: string): boolean {
  const re = new RegExp(`(^|[^a-z0-9+#.])${esc(term.toLowerCase())}($|[^a-z0-9+#])`, "i");
  return re.test(text.toLowerCase());
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const uniqCI = (arr: string[]) => {
  const seen = new Set<string>();
  return arr.filter((s) => {
    const k = s.toLowerCase();
    if (!s || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

/* ------------------------------------------------------------------ */
/* Job description analysis                                            */
/* ------------------------------------------------------------------ */

export interface JdAnalysis {
  title: string;
  keywords: string[];
  requiredYears: number | null;
}

export function analyzeJobDescription(jd: string): JdAnalysis {
  const lines = jd.split("\n").map((l) => l.trim()).filter(Boolean);

  let title = "";
  const labeled = jd.match(/(?:job\s*title|position|role)\s*[:\-]\s*([^\n]{3,70})/i);
  if (labeled) title = labeled[1].trim();
  else if (lines[0] && words(lines[0]).length <= 9) title = lines[0].replace(/^(we are hiring|hiring|job)[:\s-]*/i, "");
  else {
    const m = jd.match(/\b((?:senior|junior|lead|staff|principal|sr\.?|jr\.?)?\s*[A-Z][A-Za-z+#./]*(?:\s[A-Z][A-Za-z+#./]*){0,3}\s(?:Engineer|Developer|Manager|Analyst|Designer|Architect|Scientist|Specialist|Consultant|Director|Marketer|Accountant|Recruiter))\b/);
    if (m) title = m[1].trim();
  }
  title = title.replace(/\s+at\s+.*/i, "").replace(/[|•].*$/, "").trim();

  // Dictionary hits ranked by frequency, then free-form frequent terms.
  const lower = jd.toLowerCase();
  const dict = ALL_TERMS.map((t) => {
    if (!hasTerm(jd, t)) return null;
    const count = (lower.match(new RegExp(esc(t.toLowerCase()), "g")) || []).length;
    return { t, count };
  })
    .filter((x): x is { t: string; count: number } => !!x)
    .sort((a, b) => b.count - a.count)
    .map((x) => x.t);

  const freq = new Map<string, number>();
  for (const w of lower.match(/[a-z][a-z+#.-]{3,}/g) || []) {
    const c = w.replace(/[.-]+$/, "");
    if (STOP.has(c) || c.length < 4) continue;
    freq.set(c, (freq.get(c) || 0) + 1);
  }
  const dictLower = dict.join(" ").toLowerCase();
  const extra = [...freq.entries()]
    .filter(([w, n]) => n >= 2 && !dictLower.includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);

  const keywords = uniqCI([...dict.slice(0, 22), ...extra]).slice(0, 26);

  const yrs = [...jd.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)/gi)].map((m) => parseInt(m[1], 10)).filter((n) => n > 0 && n < 30);
  return { title, keywords, requiredYears: yrs.length ? Math.min(...yrs) : null };
}

/* ------------------------------------------------------------------ */
/* Raw resume parsing                                                  */
/* ------------------------------------------------------------------ */

const SECTION_RES: Record<string, RegExp> = {
  summary: /^(professional\s+)?(summary|profile|objective|about( me)?)$/i,
  experience: /^(work\s+|professional\s+|relevant\s+)?(experience|employment( history)?|work history|career history)$/i,
  education: /^(education|academic background|education\s*(&|and)\s*training|academics)$/i,
  skills: /^((technical|core|key)\s+)?(skills|competencies|technologies|tools)(\s*(&|and)\s*(tools|technologies))?$/i,
  other: /^(projects|certifications?|awards|languages|interests|publications|volunteer\w*|references)$/i,
};

function sectionOf(line: string): string | null {
  const t = line.replace(/^[#*_\s-]+|[*_\s:]+$/g, "").trim();
  if (!t || t.length > 40) return null;
  for (const [k, re] of Object.entries(SECTION_RES)) if (re.test(t)) return k;
  return null;
}

interface RawJob {
  company: string;
  role: string;
  duration: string;
  start: Date | null;
  end: Date | null;
  raw: string[];
}

interface Parsed {
  jobs: RawJob[];
  education: Education[];
  skillItems: string[];
  summary: string;
}

const BULLET_RE = /^\s*[-•*▪●◦–·➢✓]\s*/;

function parseDate(s: string, endOfRange: boolean): Date | null {
  if (/present|current|now/i.test(s)) return new Date();
  const y = s.match(/(?:19|20)\d{2}/);
  if (!y) return null;
  const m = s.match(new RegExp(MONTH, "i"));
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const idx = m ? months.indexOf(m[0].toLowerCase().slice(0, 3)) : endOfRange ? 11 : 0;
  return new Date(parseInt(y[0], 10), Math.max(idx, 0), 1);
}

function makeJob(header: string[]): RawJob {
  let joined = header.join(" | ");
  let duration = "";
  let start: Date | null = null;
  let end: Date | null = null;
  const dm = joined.match(DATE_RE);
  if (dm) {
    duration = dm[0].replace(/\s*(?:-|–|—|to)\s*/i, " – ").replace(/\b(present|current|now)\b/i, "Present");
    start = parseDate(dm[1], false);
    end = parseDate(dm[2], true);
    joined = joined.replace(dm[0], "");
  }
  joined = joined.replace(/[()]/g, " ");
  let parts = joined.split(/\s*(?:\||—|–|\s-\s|@|\bat\b)\s*/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) parts = joined.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  let role = "";
  let company = "";
  const ri = parts.findIndex((p) => TITLE_RE.test(p));
  if (ri >= 0) {
    role = parts[ri];
    company = parts.find((_, i) => i !== ri) || "";
  } else {
    role = parts[0] || "";
    company = parts[1] || "";
  }
  const tidy = (s: string) => s.replace(/^[\s|,\-–—@]+|[\s|,\-–—@]+$/g, "").replace(/\s{2,}/g, " ");
  company = tidy(company).replace(/,\s*[A-Z][A-Za-z.\s]*?,?\s+[A-Z]{2}$/, "").replace(/,\s*[A-Z]{2}$/, "");
  role = tidy(role);
  return { company, role, duration, start, end, raw: [] };
}

function parseExperience(lines: string[]): RawJob[] {
  const jobs: RawJob[] = [];
  let header: string[] = [];
  let cur: RawJob | null = null;

  const flushHeader = () => {
    if (header.length) {
      cur = makeJob(header);
      jobs.push(cur);
      header = [];
    }
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (BULLET_RE.test(t)) {
      flushHeader();
      if (!cur) {
        cur = makeJob([]);
        jobs.push(cur);
      }
      cur.raw.push(t.replace(BULLET_RE, "").trim());
      continue;
    }
    const looksLikeSentence = words(t).length >= 9 || /[.;]$/.test(t);
    if (cur && !header.length && looksLikeSentence && !DATE_RE.test(t)) {
      (cur as RawJob).raw.push(t);
      continue;
    }
    if (header.some((h) => DATE_RE.test(h)) && DATE_RE.test(t)) flushHeader();
    header.push(t);
  }
  flushHeader();
  return jobs.filter((j) => j.role || j.company || j.raw.length);
}

function parseEducation(lines: string[]): Education[] {
  const entries: { institution: string; degree: string; year: string }[] = [];
  let cur = { institution: "", degree: "", year: "" };
  const push = () => {
    if (cur.institution || cur.degree) entries.push(cur);
    cur = { institution: "", degree: "", year: "" };
  };
  for (const raw of lines) {
    const line = raw.replace(BULLET_RE, "").trim();
    if (!line) continue;
    const parts = line.split(/\s*(?:\||—|–|\s-\s|,)\s*/).map((p) => p.trim()).filter(Boolean);
    // keep "X in Y" degree names intact even when commas are used inside
    const years = [...line.matchAll(/\b(?:19|20)\d{2}\b/g)].map((m) => m[0]);
    const inst = parts.find((p) => INST_RE.test(p) && !DEGREE_RE.test(p.split(/\s+(?:in|of)\s+/i)[0]));
    const deg = parts.find((p) => DEGREE_RE.test(p) && !INST_RE.test(p));
    if (!inst && !deg) continue;
    if ((inst && cur.institution) || (deg && cur.degree)) push();
    if (inst) cur.institution = inst.replace(/\b(?:19|20)\d{2}\b/g, "").replace(/[()]/g, "").trim();
    if (deg) cur.degree = deg.replace(/\b(?:19|20)\d{2}\b/g, "").replace(/[()]/g, "").replace(/\s{2,}/g, " ").trim();
    if (years.length) cur.year = years[years.length - 1];
  }
  push();
  return entries.map((e) => ({ institution: e.institution, degree: e.degree, graduation_year: e.year }));
}

function parseRaw(raw: string): Parsed {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\t/g, " "));
  const buckets: Record<string, string[]> = { pre: [], summary: [], experience: [], education: [], skills: [], other: [] };
  let current = "pre";
  let sawHeader = false;
  for (const l of lines) {
    const s = sectionOf(l);
    if (s) {
      current = s;
      sawHeader = true;
      continue;
    }
    buckets[current].push(l);
  }

  let expLines = buckets.experience;
  if (!sawHeader || !expLines.length) expLines = [...buckets.pre, ...buckets.experience];

  let education = parseEducation(buckets.education);
  if (!education.length && !buckets.education.length) {
    const candidate = lines.filter((l) => !BULLET_RE.test(l) && l.length < 120 && DEGREE_RE.test(l) && (INST_RE.test(l) || /\b(?:19|20)\d{2}\b/.test(l)));
    education = parseEducation(candidate);
    if (education.length) expLines = expLines.filter((l) => !candidate.includes(l));
  }

  const skillItems = buckets.skills
    .join("\n")
    .split(/\n/)
    .flatMap((line) => line.replace(BULLET_RE, "").replace(/^[\w\s&/+#]{2,30}:\s*/, "").split(/[,|•;·]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length <= 32 && words(s).length <= 4);

  return {
    jobs: parseExperience(expLines),
    education,
    skillItems,
    summary: buckets.summary.join(" ").trim(),
  };
}

/* ------------------------------------------------------------------ */
/* Bullet rewriting (no invented facts)                                */
/* ------------------------------------------------------------------ */

const GERUND_TO_PAST: Record<string, string> = {
  managing: "Managed", leading: "Led", building: "Built", developing: "Developed", creating: "Created", designing: "Designed",
  implementing: "Implemented", maintaining: "Maintained", analyzing: "Analyzed", analysing: "Analysed", writing: "Wrote",
  running: "Ran", handling: "Handled", coordinating: "Coordinated", supporting: "Supported", improving: "Improved",
  testing: "Tested", training: "Trained", preparing: "Prepared", processing: "Processed", monitoring: "Monitored",
  delivering: "Delivered", planning: "Planned", overseeing: "Oversaw", reviewing: "Reviewed", resolving: "Resolved",
  launching: "Launched", optimizing: "Optimized", deploying: "Deployed", automating: "Automated", maintaing: "Maintained",
  organizing: "Organized", producing: "Produced", presenting: "Presented", reporting: "Reported", selling: "Sold",
  negotiating: "Negotiated", recruiting: "Recruited", mentoring: "Mentored", architecting: "Architected",
  migrating: "Migrated", integrating: "Integrated", documenting: "Documented", conducting: "Conducted", driving: "Drove",
  owning: "Owned", ensuring: "Ensured", providing: "Provided", performing: "Performed", executing: "Executed",
  facilitating: "Facilitated", streamlining: "Streamlined", reducing: "Reduced", increasing: "Increased",
};

const BASE_TO_PAST: Record<string, string> = {
  build: "Built", create: "Created", develop: "Developed", design: "Designed", implement: "Implemented", maintain: "Maintained",
  launch: "Launched", manage: "Managed", deploy: "Deployed", write: "Wrote", test: "Tested", improve: "Improved",
  automate: "Automated", migrate: "Migrated", optimize: "Optimized", analyze: "Analyzed", coordinate: "Coordinated",
  train: "Trained", plan: "Planned", lead: "Led", deliver: "Delivered", ship: "Shipped", integrate: "Integrated",
  document: "Documented", organize: "Organized", resolve: "Resolved", streamline: "Streamlined", reduce: "Reduced",
};

const SENT_STARTERS: { re: RegExp; kind: "gerund" | "prefix"; prefix?: string }[] = [
  { re: /^(?:(?:i\s+)?(?:was|am)\s+)?responsible\s+for\s+/i, kind: "gerund" },
  { re: /^(?:was\s+|i\s+was\s+)?in\s+charge\s+of\s+/i, kind: "gerund" },
  { re: /^(?:was\s+)?tasked\s+with\s+/i, kind: "gerund" },
  { re: /^duties\s+(?:included|include)[:\s]+/i, kind: "gerund" },
  { re: /^(?:helped|assisted)\s+(?:to\s+|with\s+|in\s+)?/i, kind: "prefix", prefix: "Contributed to " },
  { re: /^(?:was\s+)?(?:involved|participated)\s+in\s+/i, kind: "prefix", prefix: "Contributed to " },
  { re: /^worked\s+(?:on|with)\s+/i, kind: "prefix", prefix: "Contributed to " },
];

export function rewriteBullet(input: string): string {
  let b = input.replace(/\s+/g, " ").trim().replace(/^[-•*]\s*/, "");
  b = b.replace(/\bI\s+/g, "").replace(/\bmy\b/gi, "the");
  for (const s of SENT_STARTERS) {
    if (!s.re.test(b)) continue;
    const rest = b.replace(s.re, "");
    if (s.kind === "prefix") {
      const w0 = rest.split(/\s+/)[0]?.toLowerCase() || "";
      const past = BASE_TO_PAST[w0];
      b = past ? past + rest.slice(w0.length) : s.prefix + rest;
    } else {
      const first = rest.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";
      const past = GERUND_TO_PAST[first];
      b = past ? past + rest.slice(rest.indexOf(" ") === -1 ? rest.length : rest.indexOf(" ")) : "Owned " + rest;
    }
    break;
  }
  b = b.replace(/[.;]+$/, "").trim();
  if (b) b = b[0].toUpperCase() + b.slice(1);
  return b;
}

const hasMetric = (b: string) => /\d/.test(b) || /\b(dozens|hundreds|thousands|millions)\b/i.test(b);

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

function yearsOfExperience(jobs: RawJob[]): number | null {
  const starts = jobs.map((j) => j.start).filter((d): d is Date => !!d);
  const ends = jobs.map((j) => j.end).filter((d): d is Date => !!d);
  if (!starts.length || !ends.length) return null;
  const min = Math.min(...starts.map((d) => d.getTime()));
  const max = Math.max(...ends.map((d) => d.getTime()));
  return Math.max(0, Math.floor((max - min) / (365.25 * 24 * 3600 * 1000)));
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

export function generateLocal(rawResume: string, jobDescription: string): EngineOutput {
  const jd = analyzeJobDescription(jobDescription);
  const parsed = parseRaw(rawResume);

  /* ----- Work experience ----- */
  const work_experience: WorkExperience[] = parsed.jobs.map((j) => ({
    company: j.company,
    role: j.role,
    duration: j.duration,
    achievements: uniqCI(j.raw.map(rewriteBullet).filter((b) => words(b).length >= 3)),
  }));

  /* ----- Skills (only what the candidate really has) ----- */
  const fromDict = ALL_TERMS.filter((t) => hasTerm(rawResume, t));
  const allSkills = uniqCI([...parsed.skillItems, ...fromDict]);
  const jdSet = new Set(jd.keywords.map((k) => k.toLowerCase()));
  const matchesJd = (s: string) => jdSet.has(s.toLowerCase()) || [...jdSet].some((k) => k.length > 3 && s.toLowerCase().includes(k));
  const ordered = [...allSkills.filter(matchesJd), ...allSkills.filter((s) => !matchesJd(s))];
  const technical = ordered.filter((s) => !SOFT_SET.has(s.toLowerCase())).slice(0, 22);
  const soft = ordered.filter((s) => SOFT_SET.has(s.toLowerCase())).slice(0, 10);

  /* ----- Summary ----- */
  const years = yearsOfExperience(parsed.jobs);
  const latest = work_experience[0];
  const matchedKw = jd.keywords.filter((k) => hasTerm(rawResume, k));
  const kwDisplay = (k: string) => ALL_TERMS.find((t) => t.toLowerCase() === k.toLowerCase()) || k;
  const topKw = matchedKw.slice(0, 4).map(kwDisplay);
  const moreKw = matchedKw.slice(4, 7).map(kwDisplay);
  const targetTitle = jd.title ? titleCase(jd.title) : "";
  const currentRole = latest?.role || targetTitle || "Professional";

  const s1 = `${currentRole}${years ? ` with ${years}+ years of experience` : " with hands-on experience"}${
    topKw.length ? ` delivering results with ${joinList(topKw)}` : " delivering measurable business outcomes"
  }.`;
  const quantified = work_experience.flatMap((w) => w.achievements).filter(hasMetric);
  const s2 = latest?.company
    ? `Most recently at ${latest.company}${quantified.length ? `: ${lowerFirst(quantified[0])}` : `, driving projects from planning through delivery`}.`
    : quantified.length
      ? `Track record of quantifiable impact: ${lowerFirst(quantified[0])}.`
      : "Track record of taking ownership of projects from planning through delivery.";
  const s3 = targetTitle
    ? `Seeking to bring ${moreKw.length ? joinList(moreKw) + " expertise" : "this expertise"} to the ${targetTitle} role.`
    : "";
  const professional_summary = [s1, s2, s3].filter(Boolean).join(" ");

  /* ----- Education ----- */
  const education = parsed.education;

  const content: ResumeContent = {
    professional_summary,
    skills: { technical_skills: technical, soft_skills_and_methodologies: soft },
    work_experience,
    education,
  };

  /* ----- Scoring ----- */
  const finalText = [
    content.professional_summary,
    ...technical,
    ...soft,
    ...work_experience.flatMap((w) => [w.role, ...w.achievements]),
  ].join("\n");

  const kwTotal = jd.keywords.length;
  const kwMatched = jd.keywords.filter((k) => hasTerm(finalText, k));
  const kwMissing = jd.keywords.filter((k) => !hasTerm(finalText, k));
  const keyword_match = kwTotal ? Math.round(30 * (kwMatched.length / kwTotal)) : 15;

  const bullets = work_experience.flatMap((w) => w.achievements);
  const metricBullets = bullets.filter(hasMetric);
  const impact_metrics = bullets.length ? Math.round(30 * (metricBullets.length / bullets.length)) : 0;

  let formatting = 20;
  if (!work_experience.length) formatting -= 6;
  if (!technical.length && !soft.length) formatting -= 4;
  if (!education.length) formatting -= 3;
  if (bullets.some((b) => words(b).length > 40)) formatting -= 3;
  if (work_experience.some((w) => !w.duration)) formatting -= 2;
  if (work_experience.some((w) => !w.company || !w.role)) formatting -= 2;
  if (/[|\t]/.test(finalText)) formatting -= 3;
  const formatting_readability = clamp(formatting, 0, 20);

  // Role relevance
  let relevance = 0;
  const titleTokens = jd.title.toLowerCase().split(/[^a-z+#]+/).filter((w) => w.length > 2 && !STOP.has(w));
  const roleText = work_experience.map((w) => w.role.toLowerCase()).join(" ");
  if (titleTokens.length) {
    const hit = titleTokens.filter((t) => roleText.includes(t)).length;
    relevance += Math.round(8 * (hit / titleTokens.length));
  } else relevance += 4;
  const summaryHits = jd.keywords.filter((k) => hasTerm(content.professional_summary, k)).length;
  relevance += clamp(summaryHits * 2, 0, 6);
  if (jd.requiredYears && years !== null) relevance += Math.round(6 * clamp(years / jd.requiredYears, 0, 1));
  else if (jd.requiredYears && years === null) relevance += 2;
  else relevance += 6;
  const role_relevance = clamp(relevance, 0, 20);

  const overall = keyword_match + impact_metrics + formatting_readability + role_relevance;

  /* ----- Feedback ----- */
  const strengths: string[] = [];
  if (kwMatched.length)
    strengths.push(`Covers ${kwMatched.length} of ${kwTotal} target keywords, including ${joinList(kwMatched.slice(0, 3).map(kwDisplay))}.`);
  if (bullets.length)
    strengths.push(`${metricBullets.length} of ${bullets.length} experience bullets include measurable results.`);
  if (years !== null && jd.requiredYears && years >= jd.requiredYears)
    strengths.push(`${years}+ years of experience meets the ${jd.requiredYears}+ year requirement.`);
  if (formatting_readability >= 17) strengths.push("Clean single-column structure with standard section headings that ATS parsers read reliably.");
  while (strengths.length < 2) strengths.push("Standard, parser-friendly section order: Summary, Skills, Experience, Education.");

  const gaps = kwMissing.slice(0, 5).map(kwDisplay);
  if (gaps.length < 3 && bullets.length - metricBullets.length > 0)
    gaps.push(`Quantify ${bullets.length - metricBullets.length} more bullet(s) with numbers, percentages or dollar impact`);
  if (gaps.length < 3) gaps.push("Mirror exact phrasing from the job description where it is truthful");

  return {
    ats_score: {
      overall,
      breakdown: { keyword_match, impact_metrics, formatting_readability, role_relevance },
      feedback: { strengths: strengths.slice(0, 3), gaps_or_missing_keywords: gaps.slice(0, 5) },
    },
    resume_content: content,
  };
}

function lowerFirst(s: string) {
  return s ? s[0].toLowerCase() + s.slice(1) : s;
}
