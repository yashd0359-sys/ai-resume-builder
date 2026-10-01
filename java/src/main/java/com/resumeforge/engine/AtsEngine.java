package com.resumeforge.engine;

import com.resumeforge.engine.JobDescriptionAnalyzer.Analysis;
import com.resumeforge.engine.ResumeParser.Parsed;
import com.resumeforge.engine.ResumeParser.RawJob;
import com.resumeforge.model.Models.AtsScore;
import com.resumeforge.model.Models.Breakdown;
import com.resumeforge.model.Models.Education;
import com.resumeforge.model.Models.EngineOutput;
import com.resumeforge.model.Models.Feedback;
import com.resumeforge.model.Models.ResumeContent;
import com.resumeforge.model.Models.Skills;
import com.resumeforge.model.Models.WorkExperience;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static com.resumeforge.engine.Vocabulary.ALL_TERMS;
import static com.resumeforge.engine.Vocabulary.SOFT_SET;
import static com.resumeforge.engine.Vocabulary.STOP_WORDS;
import static com.resumeforge.engine.Vocabulary.clamp;
import static com.resumeforge.engine.Vocabulary.hasTerm;
import static com.resumeforge.engine.Vocabulary.joinList;
import static com.resumeforge.engine.Vocabulary.uniqueIgnoreCase;
import static com.resumeforge.engine.Vocabulary.wordCount;

/**
 * Deterministic ATS resume engine.
 *
 * <p>It optimises raw career details against a target job description and scores the result
 * against the four-pillar, 100-point rubric:
 * <ul>
 *   <li>Keyword Match - 30 pts</li>
 *   <li>Impact &amp; Metrics - 30 pts</li>
 *   <li>Formatting &amp; Readability - 20 pts</li>
 *   <li>Role Relevance - 20 pts</li>
 * </ul>
 *
 * <p>This implementation honours operational rule 1 strictly: no job, date, degree or metric
 * is ever fabricated. It is used on its own, and as the fallback whenever the LLM path is
 * unavailable or returns malformed JSON.
 */
public final class AtsEngine {

    private AtsEngine() {
    }

    public static EngineOutput generate(String rawResume, String jobDescription) {
        Analysis jd = JobDescriptionAnalyzer.analyze(jobDescription);
        Parsed parsed = ResumeParser.parse(rawResume == null ? "" : rawResume);

        List<WorkExperience> work = buildWorkExperience(parsed);
        Skills skills = buildSkills(parsed, rawResume, jd);
        String summary = buildSummary(parsed, work, jd, rawResume);

        ResumeContent content = new ResumeContent(summary, skills, work, parsed.education());
        AtsScore score = score(content, jd, parsed, rawResume);
        return new EngineOutput(score, content);
    }

    /* ------------------------------------------------------------------ */
    /* Content assembly                                                    */
    /* ------------------------------------------------------------------ */

    private static List<WorkExperience> buildWorkExperience(Parsed parsed) {
        return parsed.jobs().stream()
                .map(job -> new WorkExperience(job.company, job.role, job.duration,
                        uniqueIgnoreCase(job.bullets.stream()
                                .map(BulletRewriter::rewrite)
                                .filter(b -> wordCount(b) >= 3)
                                .toList())))
                .toList();
    }

    /** Only skills the candidate actually evidences, ordered so job-description matches come first. */
    private static Skills buildSkills(Parsed parsed, String rawResume, Analysis jd) {
        List<String> fromDictionary = ALL_TERMS.stream().filter(t -> hasTerm(rawResume, t)).toList();
        List<String> all = new ArrayList<>(parsed.skillItems());
        all.addAll(fromDictionary);
        List<String> unique = uniqueIgnoreCase(all);

        Set<String> jdKeywords = jd.keywords().stream().map(k -> k.toLowerCase(Locale.ROOT)).collect(Collectors.toSet());
        List<String> ordered = new ArrayList<>(unique.stream().filter(s -> matchesJd(s, jdKeywords)).toList());
        ordered.addAll(unique.stream().filter(s -> !matchesJd(s, jdKeywords)).toList());

        List<String> technical = ordered.stream()
                .filter(s -> !SOFT_SET.contains(s.toLowerCase(Locale.ROOT)))
                .limit(22).toList();
        List<String> soft = ordered.stream()
                .filter(s -> SOFT_SET.contains(s.toLowerCase(Locale.ROOT)))
                .limit(10).toList();
        return new Skills(technical, soft);
    }

    private static boolean matchesJd(String skill, Set<String> jdKeywords) {
        String lower = skill.toLowerCase(Locale.ROOT);
        return jdKeywords.contains(lower) || jdKeywords.stream().anyMatch(k -> k.length() > 3 && lower.contains(k));
    }

    private static String buildSummary(Parsed parsed, List<WorkExperience> work, Analysis jd, String rawResume) {
        Integer years = yearsOfExperience(parsed.jobs());
        WorkExperience latest = work.isEmpty() ? null : work.get(0);

        List<String> matched = jd.keywords().stream()
                .filter(k -> hasTerm(rawResume, k))
                .map(JobDescriptionAnalyzer::displayKeyword)
                .toList();
        List<String> topKeywords = matched.subList(0, Math.min(4, matched.size()));
        List<String> moreKeywords = matched.size() > 4 ? matched.subList(4, Math.min(7, matched.size())) : List.of();

        String targetTitle = titleCase(jd.title());
        String currentRole = latest != null && !latest.role().isBlank()
                ? latest.role()
                : (!targetTitle.isEmpty() ? targetTitle : "Professional");

        String first = currentRole
                + (years != null ? " with " + years + "+ years of experience" : " with hands-on experience")
                + (topKeywords.isEmpty()
                        ? " delivering measurable business outcomes."
                        : " delivering results with " + joinList(topKeywords) + ".");

        List<String> quantified = work.stream()
                .flatMap(w -> w.achievements().stream())
                .filter(BulletRewriter::hasMetric)
                .toList();

        String second;
        if (latest != null && !latest.company().isBlank()) {
            second = "Most recently at " + latest.company()
                    + (quantified.isEmpty()
                            ? ", driving projects from planning through delivery."
                            : ": " + lowerFirst(quantified.get(0)) + ".");
        } else if (!quantified.isEmpty()) {
            second = "Track record of quantifiable impact: " + lowerFirst(quantified.get(0)) + ".";
        } else {
            second = "Track record of taking ownership of projects from planning through delivery.";
        }

        String third = targetTitle.isEmpty() ? "" : "Seeking to bring "
                + (moreKeywords.isEmpty() ? "this expertise" : joinList(moreKeywords) + " expertise")
                + " to the " + targetTitle + " role.";

        return Arrays.stream(new String[] {first, second, third})
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(" "));
    }

    private static Integer yearsOfExperience(List<RawJob> jobs) {
        List<LocalDate> starts = jobs.stream().map(j -> j.start).filter(Objects::nonNull).toList();
        List<LocalDate> ends = jobs.stream().map(j -> j.end).filter(Objects::nonNull).toList();
        if (starts.isEmpty() || ends.isEmpty()) {
            return null;
        }
        LocalDate min = starts.stream().min(LocalDate::compareTo).orElseThrow();
        LocalDate max = ends.stream().max(LocalDate::compareTo).orElseThrow();
        long years = ChronoUnit.YEARS.between(min, max);
        return (int) Math.max(0, years);
    }

    /* ------------------------------------------------------------------ */
    /* Scoring rubric                                                      */
    /* ------------------------------------------------------------------ */

    private static AtsScore score(ResumeContent content, Analysis jd, Parsed parsed, String rawResume) {
        List<String> finalTextParts = new ArrayList<>();
        finalTextParts.add(content.professional_summary());
        finalTextParts.addAll(content.skills().technical_skills());
        finalTextParts.addAll(content.skills().soft_skills_and_methodologies());
        content.work_experience().forEach(w -> {
            finalTextParts.add(w.role());
            finalTextParts.addAll(w.achievements());
        });
        String finalText = String.join("\n", finalTextParts);

        /* Pillar 1 - Keyword Match (30) */
        List<String> keywords = jd.keywords();
        List<String> matched = keywords.stream().filter(k -> hasTerm(finalText, k)).toList();
        List<String> missing = keywords.stream().filter(k -> !hasTerm(finalText, k)).toList();
        int keywordMatch = keywords.isEmpty() ? 15 : (int) Math.round(30.0 * matched.size() / keywords.size());

        /* Pillar 2 - Impact & Metrics (30) */
        List<String> bullets = content.work_experience().stream().flatMap(w -> w.achievements().stream()).toList();
        List<String> metricBullets = bullets.stream().filter(BulletRewriter::hasMetric).toList();
        int impactMetrics = bullets.isEmpty() ? 0 : (int) Math.round(30.0 * metricBullets.size() / bullets.size());

        /* Pillar 3 - Formatting & Readability (20) */
        int formatting = 20;
        if (content.work_experience().isEmpty()) {
            formatting -= 6;
        }
        if (content.skills().technical_skills().isEmpty() && content.skills().soft_skills_and_methodologies().isEmpty()) {
            formatting -= 4;
        }
        if (content.education().isEmpty()) {
            formatting -= 3;
        }
        if (bullets.stream().anyMatch(b -> wordCount(b) > 40)) {
            formatting -= 3;
        }
        if (content.work_experience().stream().anyMatch(w -> w.duration().isBlank())) {
            formatting -= 2;
        }
        if (content.work_experience().stream().anyMatch(w -> w.company().isBlank() || w.role().isBlank())) {
            formatting -= 2;
        }
        if (finalText.matches("(?s).*[|\t].*")) {
            formatting -= 3;
        }
        formatting = clamp(formatting, 0, 20);

        /* Pillar 4 - Role Relevance (20) */
        int relevance = 0;
        List<String> titleTokens = Arrays.stream(jd.title().toLowerCase(Locale.ROOT).split("[^a-z+#]+"))
                .filter(w -> w.length() > 2 && !STOP_WORDS.contains(w))
                .toList();
        String roleText = content.work_experience().stream()
                .map(w -> w.role().toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
        if (!titleTokens.isEmpty()) {
            long hits = titleTokens.stream().filter(roleText::contains).count();
            relevance += (int) Math.round(8.0 * hits / titleTokens.size());
        } else {
            relevance += 4;
        }
        long summaryHits = keywords.stream().filter(k -> hasTerm(content.professional_summary(), k)).count();
        relevance += clamp((int) summaryHits * 2, 0, 6);

        Integer years = yearsOfExperience(parsed.jobs());
        if (jd.requiredYears() != null && years != null) {
            relevance += (int) Math.round(6.0 * Math.min(1.0, (double) years / jd.requiredYears()));
        } else if (jd.requiredYears() != null) {
            relevance += 2;
        } else {
            relevance += 6;
        }
        relevance = clamp(relevance, 0, 20);

        Breakdown breakdown = new Breakdown(keywordMatch, impactMetrics, formatting, relevance);
        return AtsScore.of(breakdown, feedback(matched, missing, keywords.size(), bullets, metricBullets, years,
                jd.requiredYears(), formatting));
    }

    private static Feedback feedback(List<String> matched, List<String> missing, int keywordTotal,
                                     List<String> bullets, List<String> metricBullets,
                                     Integer years, Integer requiredYears, int formatting) {
        List<String> strengths = new ArrayList<>();
        if (!matched.isEmpty()) {
            List<String> sample = matched.subList(0, Math.min(3, matched.size())).stream()
                    .map(JobDescriptionAnalyzer::displayKeyword).toList();
            strengths.add("Covers " + matched.size() + " of " + keywordTotal + " target keywords, including "
                    + joinList(sample) + ".");
        }
        if (!bullets.isEmpty()) {
            strengths.add(metricBullets.size() + " of " + bullets.size()
                    + " experience bullets include measurable results.");
        }
        if (years != null && requiredYears != null && years >= requiredYears) {
            strengths.add(years + "+ years of experience meets the " + requiredYears + "+ year requirement.");
        }
        if (formatting >= 17) {
            strengths.add("Clean single-column structure with standard section headings that ATS parsers read reliably.");
        }
        while (strengths.size() < 2) {
            strengths.add("Standard, parser-friendly section order: Summary, Skills, Experience, Education.");
        }

        List<String> gaps = new ArrayList<>(missing.subList(0, Math.min(5, missing.size())).stream()
                .map(JobDescriptionAnalyzer::displayKeyword).toList());
        int unquantified = bullets.size() - metricBullets.size();
        if (gaps.size() < 3 && unquantified > 0) {
            gaps.add("Quantify " + unquantified + " more bullet(s) with numbers, percentages or dollar impact");
        }
        if (gaps.size() < 3) {
            gaps.add("Mirror exact phrasing from the job description where it is truthful");
        }

        return new Feedback(strengths.subList(0, Math.min(3, strengths.size())),
                gaps.subList(0, Math.min(5, gaps.size())));
    }

    /* ------------------------------------------------------------------ */

    private static String lowerFirst(String s) {
        return s == null || s.isEmpty() ? s : Character.toLowerCase(s.charAt(0)) + s.substring(1);
    }

    private static String titleCase(String s) {
        if (s == null || s.isBlank()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(s);
        boolean newWord = true;
        for (int i = 0; i < sb.length(); i++) {
            char c = sb.charAt(i);
            if (newWord && Character.isLetter(c)) {
                sb.setCharAt(i, Character.toUpperCase(c));
                newWord = false;
            } else if (!Character.isLetterOrDigit(c)) {
                newWord = true;
            }
        }
        return sb.toString();
    }
}
