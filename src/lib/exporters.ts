import type { Candidate, ResumeContent } from "./types";
import { contactLine } from "./format";

/**
 * Export helpers.
 *
 * Both exporters emit real, machine-readable text (never an image or a table layout),
 * which is what keeps the output parseable by ATS software.
 */

export function safeFileName(candidate: Candidate, ext: string): string {
  const base = (candidate.name || "resume").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "resume"}-resume.${ext}`;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------ */
/* PDF                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Builds a single-column PDF with selectable text using jsPDF.
 * No tables, text boxes or columns — only linear text runs and simple bullets.
 */
export async function downloadPdf(candidate: Candidate, content: ResumeContent) {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54; // 0.75"
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const write = (
    text: string,
    opts: { size?: number; style?: "normal" | "bold" | "italic"; gap?: number; indent?: number; width?: number } = {}
  ) => {
    const { size = 10.5, style = "normal", gap = 3, indent = 0, width = maxW - indent } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width) as string[];
    const lineH = size * 1.32;
    for (const line of lines) {
      ensureSpace(lineH);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += gap;
  };

  const sectionHeading = (label: string) => {
    ensureSpace(30);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label.toUpperCase(), margin, y);
    y += 5;
    doc.setDrawColor(30);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 13;
  };

  /* Header */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const name = candidate.name || "Your Name";
  doc.text(name, pageW / 2, y, { align: "center" });
  y += 22;

  const contact = contactLine(candidate);
  if (contact) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(contact, maxW) as string[];
    for (const line of lines) {
      doc.text(line, pageW / 2, y, { align: "center" });
      y += 13;
    }
  }
  y += 2;

  /* Summary */
  if (content.professional_summary) {
    sectionHeading("Professional Summary");
    write(content.professional_summary);
  }

  /* Skills */
  const { technical_skills: tech, soft_skills_and_methodologies: soft } = content.skills;
  if (tech.length || soft.length) {
    sectionHeading("Skills");
    if (tech.length) write(`Technical Skills: ${tech.join(", ")}`, { gap: 2 });
    if (soft.length) write(`Methodologies & Leadership: ${soft.join(", ")}`, { gap: 2 });
  }

  /* Experience */
  if (content.work_experience.length) {
    sectionHeading("Work Experience");
    content.work_experience.forEach((w, i) => {
      if (i) y += 5;
      ensureSpace(32);
      const heading = [w.role, w.company].filter(Boolean).join(", ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);

      let headingW = maxW;
      if (w.duration) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        const durW = doc.getTextWidth(w.duration);
        doc.text(w.duration, pageW - margin, y, { align: "right" });
        headingW = maxW - durW - 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
      }
      const headLines = doc.splitTextToSize(heading, headingW) as string[];
      for (const line of headLines) {
        doc.text(line, margin, y);
        y += 14;
      }
      y += 2;

      for (const achievement of w.achievements) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(achievement, maxW - 16) as string[];
        lines.forEach((line, idx) => {
          ensureSpace(14);
          if (idx === 0) doc.text("\u2022", margin + 3, y);
          doc.text(line, margin + 16, y);
          y += 14;
        });
        y += 1.5;
      }
    });
  }

  /* Education */
  if (content.education.length) {
    sectionHeading("Education");
    for (const e of content.education) {
      ensureSpace(16);
      const text = [e.degree, e.institution].filter(Boolean).join(", ");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      if (e.graduation_year) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.text(e.graduation_year, pageW - margin, y, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
      }
      const lines = doc.splitTextToSize(text, maxW - 60) as string[];
      for (const line of lines) {
        doc.text(line, margin, y);
        y += 14;
      }
      y += 2;
    }
  }

  doc.setProperties({ title: `${name} — Resume`, subject: "Resume", creator: "ResumeForge AI" });
  doc.save(safeFileName(candidate, "pdf"));
}

/* ------------------------------------------------------------------ */
/* DOCX                                                                */
/* ------------------------------------------------------------------ */

/**
 * Builds a genuine Word .docx using standard paragraph styles and list bullets.
 * Recruiters can edit it, and Workday-style parsers read it natively.
 */
export async function downloadDocx(candidate: Candidate, content: ResumeContent) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, convertInchesToTwip } =
    await import("docx");

  const RIGHT_TAB = convertInchesToTwip(7.0);

  const heading = (label: string) =>
    new Paragraph({
      spacing: { before: 240, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "222222", space: 2 } },
      children: [new TextRun({ text: label.toUpperCase(), bold: true, size: 22, characterSpacing: 20 })],
    });

  const body = (text: string, after = 60) =>
    new Paragraph({ spacing: { after }, children: [new TextRun({ text, size: 21 })] });

  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: candidate.name || "Your Name", bold: true, size: 40 })],
    })
  );

  const contact = contactLine(candidate);
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: contact, size: 19 })],
      })
    );
  }

  if (content.professional_summary) {
    children.push(heading("Professional Summary"), body(content.professional_summary));
  }

  const { technical_skills: tech, soft_skills_and_methodologies: soft } = content.skills;
  if (tech.length || soft.length) {
    children.push(heading("Skills"));
    if (tech.length) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Technical Skills: ", bold: true, size: 21 }),
            new TextRun({ text: tech.join(", "), size: 21 }),
          ],
        })
      );
    }
    if (soft.length) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: "Methodologies & Leadership: ", bold: true, size: 21 }),
            new TextRun({ text: soft.join(", "), size: 21 }),
          ],
        })
      );
    }
  }

  if (content.work_experience.length) {
    children.push(heading("Work Experience"));
    for (const w of content.work_experience) {
      const titleRuns = [new TextRun({ text: w.role || "Role", bold: true, size: 21 })];
      if (w.company) titleRuns.push(new TextRun({ text: `, ${w.company}`, size: 21 }));
      if (w.duration) {
        titleRuns.push(new TextRun({ text: "\t", size: 21 }));
        titleRuns.push(new TextRun({ text: w.duration, italics: true, size: 19 }));
      }
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
          children: titleRuns,
        })
      );
      for (const a of w.achievements) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: a, size: 21 })],
          })
        );
      }
    }
  }

  if (content.education.length) {
    children.push(heading("Education"));
    for (const e of content.education) {
      const runs = [new TextRun({ text: e.degree || "Degree", bold: true, size: 21 })];
      if (e.institution) runs.push(new TextRun({ text: `, ${e.institution}`, size: 21 }));
      if (e.graduation_year) {
        runs.push(new TextRun({ text: "\t", size: 21 }));
        runs.push(new TextRun({ text: e.graduation_year, italics: true, size: 19 }));
      }
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
          children: runs,
        })
      );
    }
  }

  const doc = new Document({
    creator: "ResumeForge AI",
    title: `${candidate.name || "Resume"} — Resume`,
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: convertInchesToTwip(0.6), bottom: convertInchesToTwip(0.6), left: convertInchesToTwip(0.75), right: convertInchesToTwip(0.75) } },
        },
        children,
      },
    ],
  });

  saveBlob(await Packer.toBlob(doc), safeFileName(candidate, "docx"));
}

/* ------------------------------------------------------------------ */
/* Plain text / JSON                                                   */
/* ------------------------------------------------------------------ */

export function downloadText(candidate: Candidate, text: string) {
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), safeFileName(candidate, "txt"));
}

export function downloadJson(candidate: Candidate, json: string) {
  saveBlob(new Blob([json], { type: "application/json" }), safeFileName(candidate, "json"));
}
