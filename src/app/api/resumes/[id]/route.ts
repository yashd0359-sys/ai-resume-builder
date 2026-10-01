import { db } from "@/db";
import { resumes } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return Response.json({ error: "Bad id" }, { status: 400 });
  const [row] = await db.select().from(resumes).where(eq(resumes.id, n)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ resume: row });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = parseInt(id, 10);
  if (!Number.isFinite(n)) return Response.json({ error: "Bad id" }, { status: 400 });
  await db.delete(resumes).where(eq(resumes.id, n));
  return Response.json({ ok: true });
}
