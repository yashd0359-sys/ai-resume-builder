import { db } from "@/db";
import { resumes } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: resumes.id,
        title: resumes.title,
        engine: resumes.engine,
        overallScore: resumes.overallScore,
        createdAt: resumes.createdAt,
      })
      .from(resumes)
      .orderBy(desc(resumes.createdAt))
      .limit(50);
    return Response.json({ resumes: rows });
  } catch {
    return Response.json({ resumes: [] });
  }
}
