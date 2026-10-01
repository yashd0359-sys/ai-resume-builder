import type { Candidate, ResumeContent } from "./types";

export const emptyCandidate: Candidate = { name: "", email: "", phone: "", location: "", links: "" };

export function contactLine(c: Candidate): string {
  return [c.email, c.phone, c.location, c.links].map((s) => s.trim()).filter(Boolean).join("  •  ");
}

/** Plain-text export: the most ATS-safe format (no tables, columns or symbols). */
export function resumeToText(c: Candidate, r: ResumeContent): string {
  const out: string[] = [];
  if (c.name) out.push(c.name.toUpperCase());
  const contact = contactLine(c);
  if (contact) out.push(contact);
  if (out.length) out.push("");

  if (r.professional_summary) out.push("PROFESSIONAL SUMMARY", r.professional_summary, "");

  const skills = [
    r.skills.technical_skills.length ? `Technical Skills: ${r.skills.technical_skills.join(", ")}` : "",
    r.skills.soft_skills_and_methodologies.length ? `Methodologies & Leadership: ${r.skills.soft_skills_and_methodologies.join(", ")}` : "",
  ].filter(Boolean);
  if (skills.length) out.push("SKILLS", ...skills, "");

  if (r.work_experience.length) {
    out.push("WORK EXPERIENCE");
    for (const w of r.work_experience) {
      out.push([w.role, w.company].filter(Boolean).join(", ") + (w.duration ? ` (${w.duration})` : ""));
      for (const a of w.achievements) out.push(`- ${a}`);
      out.push("");
    }
  }

  if (r.education.length) {
    out.push("EDUCATION");
    for (const e of r.education) {
      out.push([e.degree, e.institution].filter(Boolean).join(", ") + (e.graduation_year ? ` (${e.graduation_year})` : ""));
    }
  }
  return out.join("\n").trim() + "\n";
}
