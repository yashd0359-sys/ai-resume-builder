import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  engine: text("engine").notNull().default("local"),
  overallScore: integer("overall_score").notNull().default(0),
  candidate: jsonb("candidate").notNull(),
  rawInput: text("raw_input").notNull(),
  jobDescription: text("job_description").notNull(),
  result: jsonb("result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
