package com.resumeforge.engine;

import com.resumeforge.model.Models.AtsScore;
import com.resumeforge.model.Models.Breakdown;
import com.resumeforge.model.Models.Education;
import com.resumeforge.model.Models.EngineOutput;
import com.resumeforge.model.Models.Feedback;
import com.resumeforge.model.Models.ResumeContent;
import com.resumeforge.model.Models.Skills;
import com.resumeforge.model.Models.WorkExperience;

import java.util.List;

/**
 * Minimal, dependency-free JSON writer for {@link EngineOutput}.
 *
 * <p>The Spring layer uses Jackson, but keeping this here means the engine core can be
 * compiled and run with nothing but a JDK:
 * <pre>javac -d out $(find src/main/java/com/resumeforge/{engine,model} -name '*.java')
 * java -cp out com.resumeforge.engine.Main</pre>
 */
public final class Json {

    private Json() {
    }

    public static String escape(String raw) {
        String s = raw == null ? "" : raw;
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    private static void indent(StringBuilder sb, int depth) {
        sb.append("  ".repeat(depth));
    }

    private static void strings(StringBuilder sb, List<String> items, int depth) {
        if (items == null || items.isEmpty()) {
            sb.append("[]");
            return;
        }
        sb.append("[\n");
        for (int i = 0; i < items.size(); i++) {
            indent(sb, depth + 1);
            sb.append('"').append(escape(items.get(i))).append('"');
            sb.append(i < items.size() - 1 ? ",\n" : "\n");
        }
        indent(sb, depth);
        sb.append(']');
    }

    /** Serialises the engine output as pretty-printed JSON matching the required contract. */
    public static String write(EngineOutput out) {
        StringBuilder sb = new StringBuilder(2048);
        AtsScore score = out.ats_score();
        Breakdown b = score.breakdown();
        Feedback f = score.feedback();
        ResumeContent rc = out.resume_content();
        Skills sk = rc.skills();

        sb.append("{\n");
        indent(sb, 1);
        sb.append("\"ats_score\": {\n");
        indent(sb, 2);
        sb.append("\"overall\": ").append(score.overall()).append(",\n");
        indent(sb, 2);
        sb.append("\"breakdown\": {\n");
        indent(sb, 3);
        sb.append("\"keyword_match\": ").append(b.keyword_match()).append(",\n");
        indent(sb, 3);
        sb.append("\"impact_metrics\": ").append(b.impact_metrics()).append(",\n");
        indent(sb, 3);
        sb.append("\"formatting_readability\": ").append(b.formatting_readability()).append(",\n");
        indent(sb, 3);
        sb.append("\"role_relevance\": ").append(b.role_relevance()).append('\n');
        indent(sb, 2);
        sb.append("},\n");
        indent(sb, 2);
        sb.append("\"feedback\": {\n");
        indent(sb, 3);
        sb.append("\"strengths\": ");
        strings(sb, f.strengths(), 3);
        sb.append(",\n");
        indent(sb, 3);
        sb.append("\"gaps_or_missing_keywords\": ");
        strings(sb, f.gaps_or_missing_keywords(), 3);
        sb.append('\n');
        indent(sb, 2);
        sb.append("}\n");
        indent(sb, 1);
        sb.append("},\n");

        indent(sb, 1);
        sb.append("\"resume_content\": {\n");
        indent(sb, 2);
        sb.append("\"professional_summary\": \"").append(escape(rc.professional_summary())).append("\",\n");
        indent(sb, 2);
        sb.append("\"skills\": {\n");
        indent(sb, 3);
        sb.append("\"technical_skills\": ");
        strings(sb, sk.technical_skills(), 3);
        sb.append(",\n");
        indent(sb, 3);
        sb.append("\"soft_skills_and_methodologies\": ");
        strings(sb, sk.soft_skills_and_methodologies(), 3);
        sb.append('\n');
        indent(sb, 2);
        sb.append("},\n");

        indent(sb, 2);
        sb.append("\"work_experience\": ");
        List<WorkExperience> work = rc.work_experience();
        if (work.isEmpty()) {
            sb.append("[],\n");
        } else {
            sb.append("[\n");
            for (int i = 0; i < work.size(); i++) {
                WorkExperience w = work.get(i);
                indent(sb, 3);
                sb.append("{\n");
                indent(sb, 4);
                sb.append("\"company\": \"").append(escape(w.company())).append("\",\n");
                indent(sb, 4);
                sb.append("\"role\": \"").append(escape(w.role())).append("\",\n");
                indent(sb, 4);
                sb.append("\"duration\": \"").append(escape(w.duration())).append("\",\n");
                indent(sb, 4);
                sb.append("\"achievements\": ");
                strings(sb, w.achievements(), 4);
                sb.append('\n');
                indent(sb, 3);
                sb.append(i < work.size() - 1 ? "},\n" : "}\n");
            }
            indent(sb, 2);
            sb.append("],\n");
        }

        indent(sb, 2);
        sb.append("\"education\": ");
        List<Education> edu = rc.education();
        if (edu.isEmpty()) {
            sb.append("[]\n");
        } else {
            sb.append("[\n");
            for (int i = 0; i < edu.size(); i++) {
                Education e = edu.get(i);
                indent(sb, 3);
                sb.append("{\n");
                indent(sb, 4);
                sb.append("\"institution\": \"").append(escape(e.institution())).append("\",\n");
                indent(sb, 4);
                sb.append("\"degree\": \"").append(escape(e.degree())).append("\",\n");
                indent(sb, 4);
                sb.append("\"graduation_year\": \"").append(escape(e.graduation_year())).append("\"\n");
                indent(sb, 3);
                sb.append(i < edu.size() - 1 ? "},\n" : "}\n");
            }
            indent(sb, 2);
            sb.append("]\n");
        }

        indent(sb, 1);
        sb.append("}\n}");
        return sb.toString();
    }
}
