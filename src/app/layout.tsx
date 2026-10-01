import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeForge AI — ATS-optimized resumes with a strict score",
  description:
    "Paste your experience and a target job description. Get an ATS-optimized resume with XYZ-formula bullets and a transparent 100-point ATS score.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
