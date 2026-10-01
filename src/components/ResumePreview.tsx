import type { Candidate, ResumeContent } from "@/lib/types";
import { contactLine } from "@/lib/format";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-5 border-b border-slate-800 pb-0.5 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-900">
      {children}
    </h3>
  );
}

export default function ResumePreview({ candidate, content }: { candidate: Candidate; content: ResumeContent }) {
  const contact = contactLine(candidate);
  const { skills } = content;
  return (
    <div id="resume-print" className="resume-paper mx-auto w-full max-w-[820px] rounded-md border border-slate-200 bg-white p-8 text-[14px] leading-relaxed text-slate-900 shadow-lg sm:p-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-wide">{candidate.name || "Your Name"}</h2>
        {contact && <p className="mt-1 text-[13px] text-slate-700">{contact}</p>}
      </div>

      {content.professional_summary && (
        <>
          <H>Professional Summary</H>
          <p>{content.professional_summary}</p>
        </>
      )}

      {(skills.technical_skills.length > 0 || skills.soft_skills_and_methodologies.length > 0) && (
        <>
          <H>Skills</H>
          {skills.technical_skills.length > 0 && (
            <p>
              <b>Technical Skills: </b>
              {skills.technical_skills.join(", ")}
            </p>
          )}
          {skills.soft_skills_and_methodologies.length > 0 && (
            <p className="mt-1">
              <b>Methodologies &amp; Leadership: </b>
              {skills.soft_skills_and_methodologies.join(", ")}
            </p>
          )}
        </>
      )}

      {content.work_experience.length > 0 && (
        <>
          <H>Work Experience</H>
          {content.work_experience.map((w, i) => (
            <div key={i} className={i ? "mt-3.5" : ""}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <div>
                  <b>{w.role || "Role"}</b>
                  {w.company && <span>, {w.company}</span>}
                </div>
                {w.duration && <span className="text-[13px] italic text-slate-700">{w.duration}</span>}
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {w.achievements.map((a, j) => (
                  <li key={j}>{a}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {content.education.length > 0 && (
        <>
          <H>Education</H>
          {content.education.map((e, i) => (
            <div key={i} className="flex flex-wrap items-baseline justify-between gap-x-4">
              <div>
                <b>{e.degree}</b>
                {e.institution && <span>{e.degree ? ", " : ""}{e.institution}</span>}
              </div>
              {e.graduation_year && <span className="text-[13px] italic text-slate-700">{e.graduation_year}</span>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
