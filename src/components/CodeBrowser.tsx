"use client";

import { useState } from "react";

export interface SourceFile {
  path: string;
  label: string;
  group: string;
  lines: number;
  code: string;
}

export default function CodeBrowser({ files }: { files: SourceFile[] }) {
  const [active, setActive] = useState(files[0]?.path ?? "");
  const [copied, setCopied] = useState(false);
  const current = files.find((f) => f.path === active) ?? files[0];
  const groups = [...new Set(files.map((f) => f.group))];

  if (!current) return <p className="text-slate-600">No Java sources found.</p>;

  function download() {
    const url = URL.createObjectURL(new Blob([current.code], { type: "text/x-java-source" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = current.label;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    await navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-20">
        {groups.map((g) => (
          <div key={g} className="mb-3 last:mb-0">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</div>
            <ul>
              {files
                .filter((f) => f.group === g)
                .map((f) => (
                  <li key={f.path}>
                    <button
                      onClick={() => setActive(f.path)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                        f.path === active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{f.label}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{f.lines}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-b-0 border-slate-700 bg-slate-800 px-4 py-2.5">
          <code className="truncate text-xs text-slate-300">{current.path}</code>
          <div className="flex gap-2">
            <button onClick={copy} className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20">
              {copied ? "Copied ✓" : "Copy"}
            </button>
            <button onClick={download} className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20">
              Download
            </button>
          </div>
        </div>
        <pre className="max-h-[70vh] overflow-auto rounded-b-xl border border-slate-700 bg-slate-900 p-5 text-[12.5px] leading-relaxed text-slate-100">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
}
