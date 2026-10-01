package com.resumeforge.engine;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static com.resumeforge.engine.Vocabulary.ALL_TERMS;
import static com.resumeforge.engine.Vocabulary.STOP_WORDS;
import static com.resumeforge.engine.Vocabulary.escapeRegex;
import static com.resumeforge.engine.Vocabulary.hasTerm;
import static com.resumeforge.engine.Vocabulary.uniqueIgnoreCase;
import static com.resumeforge.engine.Vocabulary.wordCount;

/**
 * Extracts the target job title, the prioritised keyword set and the required years of
 * experience from a raw job description. These drive both keyword optimisation and scoring.
 */
public final class JobDescriptionAnalyzer {

    /** Result of analysing a target job description. */
    public record Analysis(String title, List<String> keywords, Integer requiredYears) {
    }

    private static final Pattern LABELLED_TITLE =
            Pattern.compile("(?:job\\s*title|position|role)\\s*[:\\-]\\s*([^\\n]{3,70})", Pattern.CASE_INSENSITIVE);

    private static final Pattern INLINE_TITLE = Pattern.compile(
            "\\b((?:senior|junior|lead|staff|principal|sr\\.?|jr\\.?)?\\s*[A-Z][A-Za-z+#./]*"
                    + "(?:\\s[A-Z][A-Za-z+#./]*){0,3}\\s(?:Engineer|Developer|Manager|Analyst|Designer|Architect"
                    + "|Scientist|Specialist|Consultant|Director|Marketer|Accountant|Recruiter))\\b");

    private static final Pattern YEARS =
            Pattern.compile("(\\d{1,2})\\s*\\+?\\s*(?:years|yrs)", Pattern.CASE_INSENSITIVE);

    private static final Pattern FREE_WORD = Pattern.compile("[a-z][a-z+#.-]{3,}");

    private JobDescriptionAnalyzer() {
    }

    public static Analysis analyze(String jobDescription) {
        String jd = jobDescription == null ? "" : jobDescription;
        List<String> lines = jd.lines().map(String::trim).filter(s -> !s.isEmpty()).toList();

        String title = extractTitle(jd, lines);
        List<String> keywords = extractKeywords(jd);

        Integer requiredYears = null;
        Matcher ym = YEARS.matcher(jd);
        while (ym.find()) {
            int n = Integer.parseInt(ym.group(1));
            if (n > 0 && n < 30 && (requiredYears == null || n < requiredYears)) {
                requiredYears = n;
            }
        }
        return new Analysis(title, keywords, requiredYears);
    }

    private static String extractTitle(String jd, List<String> lines) {
        String title = "";
        Matcher labelled = LABELLED_TITLE.matcher(jd);
        if (labelled.find()) {
            title = labelled.group(1).trim();
        } else if (!lines.isEmpty() && wordCount(lines.get(0)) <= 9) {
            title = lines.get(0).replaceAll("(?i)^(we are hiring|hiring|job)[:\\s-]*", "");
        } else {
            Matcher inline = INLINE_TITLE.matcher(jd);
            if (inline.find()) {
                title = inline.group(1).trim();
            }
        }
        return title.replaceAll("(?i)\\s+at\\s+.*", "").replaceAll("[|\u2022].*$", "").trim();
    }

    /**
     * Dictionary hits ranked by frequency, topped up with frequently repeated free-form
     * terms so niche domain vocabulary is not lost.
     */
    private static List<String> extractKeywords(String jd) {
        String lower = jd.toLowerCase(Locale.ROOT);

        List<String> dictionaryHits = ALL_TERMS.stream()
                .filter(term -> hasTerm(jd, term))
                .sorted(Comparator.comparingInt((String term) -> -countOccurrences(lower, term.toLowerCase(Locale.ROOT))))
                .toList();

        Map<String, Integer> frequency = new LinkedHashMap<>();
        Matcher m = FREE_WORD.matcher(lower);
        while (m.find()) {
            String w = m.group().replaceAll("[.-]+$", "");
            if (w.length() < 4 || STOP_WORDS.contains(w)) {
                continue;
            }
            frequency.merge(w, 1, Integer::sum);
        }

        String dictBlob = String.join(" ", dictionaryHits).toLowerCase(Locale.ROOT);
        List<String> extras = frequency.entrySet().stream()
                .filter(e -> e.getValue() >= 2 && !dictBlob.contains(e.getKey()))
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(6)
                .map(Map.Entry::getKey)
                .toList();

        List<String> combined = new ArrayList<>(dictionaryHits.subList(0, Math.min(22, dictionaryHits.size())));
        combined.addAll(extras);
        List<String> unique = uniqueIgnoreCase(combined);
        return unique.subList(0, Math.min(26, unique.size()));
    }

    private static int countOccurrences(String haystack, String needle) {
        Matcher m = Pattern.compile(escapeRegex(needle)).matcher(haystack);
        int n = 0;
        while (m.find()) {
            n++;
        }
        return n;
    }

    /** Restores canonical casing ("typescript" -> "TypeScript") for display. */
    public static String displayKeyword(String keyword) {
        return ALL_TERMS.stream()
                .filter(t -> t.equalsIgnoreCase(keyword))
                .findFirst()
                .orElse(keyword);
    }
}
