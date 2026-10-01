package com.resumeforge.engine;

import com.resumeforge.model.Models.Education;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.resumeforge.engine.Vocabulary.BULLET;
import static com.resumeforge.engine.Vocabulary.DATE_RANGE;
import static com.resumeforge.engine.Vocabulary.DEGREE;
import static com.resumeforge.engine.Vocabulary.INSTITUTION;
import static com.resumeforge.engine.Vocabulary.MONTH;
import static com.resumeforge.engine.Vocabulary.TITLE_PATTERN;
import static com.resumeforge.engine.Vocabulary.wordCount;

/**
 * Parses free-form resume text (pasted resume, LinkedIn export or rough notes) into
 * structured jobs, education entries and skills. Nothing is invented: every value here
 * originates from the user's own text.
 */
public final class ResumeParser {

    /** A job as found in the raw text, before bullet rewriting. */
    public static final class RawJob {
        public String company = "";
        public String role = "";
        public String duration = "";
        public LocalDate start;
        public LocalDate end;
        public final List<String> bullets = new ArrayList<>();
    }

    public record Parsed(List<RawJob> jobs, List<Education> education, List<String> skillItems, String summary) {
    }

    private static final Map<String, Pattern> SECTIONS = new LinkedHashMap<>();

    static {
        SECTIONS.put("summary", Pattern.compile("^(professional\\s+)?(summary|profile|objective|about( me)?)$", Pattern.CASE_INSENSITIVE));
        SECTIONS.put("experience", Pattern.compile("^(work\\s+|professional\\s+|relevant\\s+)?(experience|employment( history)?|work history|career history)$", Pattern.CASE_INSENSITIVE));
        SECTIONS.put("education", Pattern.compile("^(education|academic background|education\\s*(&|and)\\s*training|academics)$", Pattern.CASE_INSENSITIVE));
        SECTIONS.put("skills", Pattern.compile("^((technical|core|key)\\s+)?(skills|competencies|technologies|tools)(\\s*(&|and)\\s*(tools|technologies))?$", Pattern.CASE_INSENSITIVE));
        SECTIONS.put("other", Pattern.compile("^(projects|certifications?|awards|languages|interests|publications|volunteer\\w*|references)$", Pattern.CASE_INSENSITIVE));
    }

    private static final List<String> MONTHS =
            List.of("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec");

    private ResumeParser() {
    }

    public static Parsed parse(String raw) {
        List<String> lines = Arrays.asList(raw.replace("\r", "").replace("\t", " ").split("\n", -1));

        Map<String, List<String>> buckets = new LinkedHashMap<>();
        for (String key : List.of("pre", "summary", "experience", "education", "skills", "other")) {
            buckets.put(key, new ArrayList<>());
        }

        String current = "pre";
        boolean sawHeader = false;
        for (String line : lines) {
            String section = sectionOf(line);
            if (section != null) {
                current = section;
                sawHeader = true;
                continue;
            }
            buckets.get(current).add(line);
        }

        List<String> experienceLines = new ArrayList<>(buckets.get("experience"));
        if (!sawHeader || experienceLines.isEmpty()) {
            List<String> merged = new ArrayList<>(buckets.get("pre"));
            merged.addAll(buckets.get("experience"));
            experienceLines = merged;
        }

        List<Education> education = parseEducation(buckets.get("education"));
        if (education.isEmpty() && buckets.get("education").isEmpty()) {
            List<String> candidates = lines.stream()
                    .filter(l -> !BULLET.matcher(l).find())
                    .filter(l -> l.length() < 120 && DEGREE.matcher(l).find())
                    .filter(l -> INSTITUTION.matcher(l).find() || Pattern.compile("\\b(?:19|20)\\d{2}\\b").matcher(l).find())
                    .toList();
            education = parseEducation(candidates);
            if (!education.isEmpty()) {
                List<String> finalCandidates = candidates;
                experienceLines = experienceLines.stream().filter(l -> !finalCandidates.contains(l)).toList();
            }
        }

        return new Parsed(parseExperience(experienceLines), education, parseSkills(buckets.get("skills")),
                String.join(" ", buckets.get("summary")).trim());
    }

    private static String sectionOf(String line) {
        String t = line.replaceAll("^[#*_\\s-]+", "").replaceAll("[*_\\s:]+$", "").trim();
        if (t.isEmpty() || t.length() > 40) {
            return null;
        }
        for (Map.Entry<String, Pattern> e : SECTIONS.entrySet()) {
            if (e.getValue().matcher(t).matches()) {
                return e.getKey();
            }
        }
        return null;
    }

    /* ----- Experience ----- */

    private static List<RawJob> parseExperience(List<String> lines) {
        List<RawJob> jobs = new ArrayList<>();
        List<String> header = new ArrayList<>();
        RawJob[] current = new RawJob[1];

        for (String line : lines) {
            String t = line.trim();
            if (t.isEmpty()) {
                continue;
            }

            if (BULLET.matcher(t).find()) {
                if (!header.isEmpty()) {
                    current[0] = buildJob(header);
                    jobs.add(current[0]);
                    header = new ArrayList<>();
                }
                if (current[0] == null) {
                    current[0] = buildJob(List.of());
                    jobs.add(current[0]);
                }
                current[0].bullets.add(BULLET.matcher(t).replaceFirst("").trim());
                continue;
            }

            boolean looksLikeSentence = wordCount(t) >= 9 || t.matches(".*[.;]$");
            if (current[0] != null && header.isEmpty() && looksLikeSentence && !DATE_RANGE.matcher(t).find()) {
                current[0].bullets.add(t);
                continue;
            }

            boolean headerHasDate = header.stream().anyMatch(h -> DATE_RANGE.matcher(h).find());
            if (headerHasDate && DATE_RANGE.matcher(t).find()) {
                current[0] = buildJob(header);
                jobs.add(current[0]);
                header = new ArrayList<>();
            }
            header.add(t);
        }

        if (!header.isEmpty()) {
            jobs.add(buildJob(header));
        }

        return jobs.stream()
                .filter(j -> !j.role.isEmpty() || !j.company.isEmpty() || !j.bullets.isEmpty())
                .toList();
    }

    private static RawJob buildJob(List<String> header) {
        RawJob job = new RawJob();
        String joined = String.join(" | ", header);

        Matcher dm = DATE_RANGE.matcher(joined);
        if (dm.find()) {
            job.duration = dm.group()
                    .replaceAll("(?i)\\s*(?:-|\u2013|\u2014|to)\\s*", " \u2013 ")
                    .replaceAll("(?i)\\b(present|current|now)\\b", "Present");
            job.start = parseDate(dm.group(1), false);
            job.end = parseDate(dm.group(2), true);
            joined = joined.replace(dm.group(), "");
        }

        joined = joined.replaceAll("[()]", " ");
        List<String> parts = splitParts(joined, "\\s*(?:\\||\u2014|\u2013|\\s-\\s|@|\\bat\\b)\\s*");
        if (parts.size() < 2) {
            parts = splitParts(joined, "\\s*,\\s*");
        }

        int roleIndex = -1;
        for (int i = 0; i < parts.size(); i++) {
            if (TITLE_PATTERN.matcher(parts.get(i)).find()) {
                roleIndex = i;
                break;
            }
        }
        if (roleIndex >= 0) {
            job.role = parts.get(roleIndex);
            for (int i = 0; i < parts.size(); i++) {
                if (i != roleIndex) {
                    job.company = parts.get(i);
                    break;
                }
            }
        } else {
            job.role = parts.isEmpty() ? "" : parts.get(0);
            job.company = parts.size() > 1 ? parts.get(1) : "";
        }

        job.role = tidy(job.role);
        job.company = tidy(job.company)
                .replaceAll(",\\s*[A-Z][A-Za-z.\\s]*?,?\\s+[A-Z]{2}$", "")
                .replaceAll(",\\s*[A-Z]{2}$", "");
        return job;
    }

    private static List<String> splitParts(String s, String regex) {
        return Arrays.stream(s.split(regex, -1)).map(String::trim).filter(p -> !p.isEmpty()).toList();
    }

    private static String tidy(String s) {
        return s.replaceAll("^[\\s|,\\-\u2013\u2014@]+", "")
                .replaceAll("[\\s|,\\-\u2013\u2014@]+$", "")
                .replaceAll("\\s{2,}", " ");
    }

    private static LocalDate parseDate(String s, boolean endOfRange) {
        if (s.matches("(?i).*\\b(present|current|now)\\b.*")) {
            return LocalDate.now();
        }
        Matcher year = Pattern.compile("(?:19|20)\\d{2}").matcher(s);
        if (!year.find()) {
            return null;
        }
        Matcher month = Pattern.compile(MONTH, Pattern.CASE_INSENSITIVE).matcher(s);
        int monthIndex = endOfRange ? 11 : 0;
        if (month.find()) {
            int found = MONTHS.indexOf(month.group().toLowerCase(Locale.ROOT).substring(0, 3));
            if (found >= 0) {
                monthIndex = found;
            }
        }
        return LocalDate.of(Integer.parseInt(year.group()), monthIndex + 1, 1);
    }

    /* ----- Education ----- */

    private static List<Education> parseEducation(List<String> lines) {
        List<Education> result = new ArrayList<>();
        String institution = "";
        String degree = "";
        String year = "";

        for (String rawLine : lines) {
            String line = BULLET.matcher(rawLine).replaceFirst("").trim();
            if (line.isEmpty()) {
                continue;
            }
            List<String> parts = splitParts(line, "\\s*(?:\\||\u2014|\u2013|\\s-\\s|,)\\s*");

            String foundInstitution = parts.stream()
                    .filter(p -> INSTITUTION.matcher(p).find())
                    .filter(p -> !DEGREE.matcher(p.split("(?i)\\s+(?:in|of)\\s+")[0]).find())
                    .findFirst().orElse(null);
            String foundDegree = parts.stream()
                    .filter(p -> DEGREE.matcher(p).find() && !INSTITUTION.matcher(p).find())
                    .findFirst().orElse(null);
            if (foundInstitution == null && foundDegree == null) {
                continue;
            }

            if ((foundInstitution != null && !institution.isEmpty()) || (foundDegree != null && !degree.isEmpty())) {
                result.add(new Education(institution, degree, year));
                institution = "";
                degree = "";
                year = "";
            }
            if (foundInstitution != null) {
                institution = cleanEntry(foundInstitution);
            }
            if (foundDegree != null) {
                degree = cleanEntry(foundDegree);
            }
            Matcher ym = Pattern.compile("\\b(?:19|20)\\d{2}\\b").matcher(line);
            while (ym.find()) {
                year = ym.group();
            }
        }

        if (!institution.isEmpty() || !degree.isEmpty()) {
            result.add(new Education(institution, degree, year));
        }
        return result;
    }

    private static String cleanEntry(String s) {
        return s.replaceAll("\\b(?:19|20)\\d{2}\\b", "").replaceAll("[()]", "").replaceAll("\\s{2,}", " ").trim();
    }

    /* ----- Skills ----- */

    private static List<String> parseSkills(List<String> lines) {
        List<String> items = new ArrayList<>();
        for (String line : lines) {
            String cleaned = BULLET.matcher(line).replaceFirst("").replaceAll("^[\\w\\s&/+#]{2,30}:\\s*", "");
            for (String part : cleaned.split("[,|\u2022;\u00b7]")) {
                String s = part.trim();
                if (s.length() > 1 && s.length() <= 32 && wordCount(s) <= 4) {
                    items.add(s);
                }
            }
        }
        return items;
    }
}
