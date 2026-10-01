import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      </span>
      ResumeForge<span className="text-indigo-600">AI</span>
    </Link>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          <Link href="/#how" className="hover:text-slate-900">How it works</Link>
          <Link href="/#scoring" className="hover:text-slate-900">ATS scoring</Link>
          <Link href="/#features" className="hover:text-slate-900">Features</Link>
          <Link href="/java" className="hover:text-slate-900">Java engine</Link>
        </nav>
        <Link
          href="/builder"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
        >
          Build my resume
        </Link>
      </div>
    </header>
  );
}
