import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Builder from "@/components/Builder";

export const metadata: Metadata = { title: "Resume Builder — ResumeForge AI" };

export default function BuilderPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Builder />
      </main>
    </>
  );
}
