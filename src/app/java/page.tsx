import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import CodeBrowser, { type SourceFile } from "@/components/CodeBrowser";

export const metadata: Metadata = { title: "Java engine — ResumeForge AI" };
export const dynamic = "force-dynamic";

const ORDER = [
  "java/README.md",
  "java/pom.xml",
  "java/src/main/resources/application.yml",
  "java/src/main/java/com/resumeforge/ResumeForgeApplication.java",
  "java/src/main/java/com/resumeforge/model/Models.java",
  "java/src/main/java/com/resumeforge/engine/AtsEngine.java",
  "java/src/main/java/com/resumeforge/engine/JobDescriptionAnalyzer.java",
  "java/src/main/java/com/resumeforge/engine/ResumeParser.java",
  "java/src/main/java/com/resumeforge/engine/BulletRewriter.java",
  "java/src/main/java/com/resumeforge/engine/Vocabulary.java",
  "java/src/main/java/com/resumeforge/engine/Json.java",
  "java/src/main/java/com/resumeforge/engine/Main.java",
  "java/src/main/java/com/resumeforge/ai/PromptTemplates.java",
  "java/src/main/java/com/resumeforge/ai/OpenAiEngineClient.java",
  "java/src/main/java/com/resumeforge/service/ResumeService.java",
  "java/src/main/java/com/resumeforge/store/ResumeStore.java",
  "java/src/main/java/com/resumeforge/web/ResumeController.java",
  "java/src/test/java/com/resumeforge/engine/AtsEngineTest.java",
];

function groupOf(p: string): string {
  if (p.endsWith("README.md") || p.endsWith("pom.xml") || p.endsWith("application.yml")) return "Project";
  if (p.includes("/engine/")) return "Engine core";
  if (p.includes("/ai/")) return "AI / prompt";
  if (p.includes("/test/")) return "Tests";
  if (p.includes("/model/")) return "Model";
  return "Spring API";
}

function loadFiles(): SourceFile[] {
  const root = process.cwd();
  const files: SourceFile[] = [];
  for (const rel of ORDER) {
    const abs = path.join(root, rel);
    try {
      const code = fs.readFileSync(abs, "utf8");
      files.push({
        path: rel,
        label: rel.split("/").pop() ?? rel,
        group: groupOf(rel),
        lines: code.split("\n").length,
        code,
      });
    } catch {
      // skip missing file
    }
  }
  return files;
}

export default function JavaPage() {
  const files = loadFiles();
  const totalLines = files.reduce((n, f) => n + f.lines, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            ☕ Java · Spring Boot
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">The engine in Java</h1>
          <p className="mt-3 text-slate-600">
            The full AI Resume Builder engine implemented in Java: resume parsing, job-description keyword extraction, XYZ/CAR bullet rewriting, the
            100-point ATS rubric, the verbatim engine prompt, an LLM client with strict output validation, PostgreSQL persistence and a REST API.
            {" "}
            <b>{files.length} files · {totalLines.toLocaleString()} lines.</b>
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Run the engine (JDK only)</div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] text-emerald-200">{`cd java
javac -d out $(find src/main/java/com/resumeforge/engine \\
  src/main/java/com/resumeforge/model -name '*.java')
java -cp out com.resumeforge.engine.Main`}</pre>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Run the REST API</div>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] text-emerald-200">{`cd java && mvn spring-boot:run

# point the website at it:
JAVA_BACKEND_URL=http://localhost:8080`}</pre>
            </div>
          </div>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <b>Note:</b> this sandbox has no JDK or Maven installed, so the Java sources here have not been compiled or test-run. The live preview is
            served by the equivalent TypeScript engine. Run the commands above locally to build and test the Java version.
          </p>
        </div>

        <CodeBrowser files={files} />
      </main>
    </>
  );
}
