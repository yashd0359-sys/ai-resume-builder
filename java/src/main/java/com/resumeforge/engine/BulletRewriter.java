package com.resumeforge.engine;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Rewrites passive, duty-style bullet points into achievement-led statements.
 *
 * <p>Operational rule 2 of the engine specification asks for Google XYZ / CAR phrasing.
 * Rule 1 forbids inventing facts, so this deterministic rewriter will never add a metric
 * that the user did not supply: it strips filler openers ("Responsible for..."), converts
 * the remaining verb to a strong past-tense action verb, and leaves the user's own numbers
 * intact. Full XYZ restructuring requires the LLM path in {@code OpenAiEngineClient}.
 */
public final class BulletRewriter {

    private BulletRewriter() {
    }

    private static final Map<String, String> GERUND_TO_PAST = Map.ofEntries(
            Map.entry("managing", "Managed"), Map.entry("leading", "Led"), Map.entry("building", "Built"),
            Map.entry("developing", "Developed"), Map.entry("creating", "Created"), Map.entry("designing", "Designed"),
            Map.entry("implementing", "Implemented"), Map.entry("maintaining", "Maintained"),
            Map.entry("analyzing", "Analyzed"), Map.entry("analysing", "Analysed"), Map.entry("writing", "Wrote"),
            Map.entry("running", "Ran"), Map.entry("handling", "Handled"), Map.entry("coordinating", "Coordinated"),
            Map.entry("supporting", "Supported"), Map.entry("improving", "Improved"), Map.entry("testing", "Tested"),
            Map.entry("training", "Trained"), Map.entry("preparing", "Prepared"), Map.entry("processing", "Processed"),
            Map.entry("monitoring", "Monitored"), Map.entry("delivering", "Delivered"), Map.entry("planning", "Planned"),
            Map.entry("overseeing", "Oversaw"), Map.entry("reviewing", "Reviewed"), Map.entry("resolving", "Resolved"),
            Map.entry("launching", "Launched"), Map.entry("optimizing", "Optimized"), Map.entry("deploying", "Deployed"),
            Map.entry("automating", "Automated"), Map.entry("organizing", "Organized"),
            Map.entry("producing", "Produced"), Map.entry("presenting", "Presented"), Map.entry("reporting", "Reported"),
            Map.entry("selling", "Sold"), Map.entry("negotiating", "Negotiated"), Map.entry("recruiting", "Recruited"),
            Map.entry("mentoring", "Mentored"), Map.entry("architecting", "Architected"),
            Map.entry("migrating", "Migrated"), Map.entry("integrating", "Integrated"),
            Map.entry("documenting", "Documented"), Map.entry("conducting", "Conducted"), Map.entry("driving", "Drove"),
            Map.entry("owning", "Owned"), Map.entry("ensuring", "Ensured"), Map.entry("providing", "Provided"),
            Map.entry("performing", "Performed"), Map.entry("executing", "Executed"),
            Map.entry("facilitating", "Facilitated"), Map.entry("streamlining", "Streamlined"),
            Map.entry("reducing", "Reduced"), Map.entry("increasing", "Increased"));

    private static final Map<String, String> BASE_TO_PAST = Map.ofEntries(
            Map.entry("build", "Built"), Map.entry("create", "Created"), Map.entry("develop", "Developed"),
            Map.entry("design", "Designed"), Map.entry("implement", "Implemented"), Map.entry("maintain", "Maintained"),
            Map.entry("launch", "Launched"), Map.entry("manage", "Managed"), Map.entry("deploy", "Deployed"),
            Map.entry("write", "Wrote"), Map.entry("test", "Tested"), Map.entry("improve", "Improved"),
            Map.entry("automate", "Automated"), Map.entry("migrate", "Migrated"), Map.entry("optimize", "Optimized"),
            Map.entry("analyze", "Analyzed"), Map.entry("coordinate", "Coordinated"), Map.entry("train", "Trained"),
            Map.entry("plan", "Planned"), Map.entry("lead", "Led"), Map.entry("deliver", "Delivered"),
            Map.entry("ship", "Shipped"), Map.entry("integrate", "Integrated"), Map.entry("document", "Documented"),
            Map.entry("organize", "Organized"), Map.entry("resolve", "Resolved"),
            Map.entry("streamline", "Streamlined"), Map.entry("reduce", "Reduced"));

    private enum Kind { GERUND, PREFIX }

    private record Starter(Pattern pattern, Kind kind, String replacement) {
    }

    private static final List<Starter> STARTERS = List.of(
            new Starter(Pattern.compile("^(?:(?:i\\s+)?(?:was|am)\\s+)?responsible\\s+for\\s+", Pattern.CASE_INSENSITIVE), Kind.GERUND, null),
            new Starter(Pattern.compile("^(?:was\\s+|i\\s+was\\s+)?in\\s+charge\\s+of\\s+", Pattern.CASE_INSENSITIVE), Kind.GERUND, null),
            new Starter(Pattern.compile("^(?:was\\s+)?tasked\\s+with\\s+", Pattern.CASE_INSENSITIVE), Kind.GERUND, null),
            new Starter(Pattern.compile("^duties\\s+(?:included|include)[:\\s]+", Pattern.CASE_INSENSITIVE), Kind.GERUND, null),
            new Starter(Pattern.compile("^(?:helped|assisted)\\s+(?:to\\s+|with\\s+|in\\s+)?", Pattern.CASE_INSENSITIVE), Kind.PREFIX, "Contributed to "),
            new Starter(Pattern.compile("^(?:was\\s+)?(?:involved|participated)\\s+in\\s+", Pattern.CASE_INSENSITIVE), Kind.PREFIX, "Contributed to "),
            new Starter(Pattern.compile("^worked\\s+(?:on|with)\\s+", Pattern.CASE_INSENSITIVE), Kind.PREFIX, "Contributed to "));

    private static final Pattern METRIC =
            Pattern.compile("\\d|\\b(dozens|hundreds|thousands|millions)\\b", Pattern.CASE_INSENSITIVE);

    public static boolean hasMetric(String bullet) {
        return bullet != null && METRIC.matcher(bullet).find();
    }

    public static String rewrite(String input) {
        if (input == null) {
            return "";
        }
        String b = input.replaceAll("\\s+", " ").trim().replaceAll("^[-\u2022*]\\s*", "");
        b = b.replaceAll("\\bI\\s+", "").replaceAll("(?i)\\bmy\\b", "the");

        for (Starter starter : STARTERS) {
            if (!starter.pattern().matcher(b).find()) {
                continue;
            }
            String rest = starter.pattern().matcher(b).replaceFirst("");
            String firstWord = firstWord(rest);
            if (starter.kind() == Kind.PREFIX) {
                String past = BASE_TO_PAST.get(firstWord);
                b = past != null ? past + rest.substring(firstWord.length()) : starter.replacement() + rest;
            } else {
                String past = GERUND_TO_PAST.get(firstWord);
                b = past != null ? past + rest.substring(firstWord.length()) : "Owned " + rest;
            }
            break;
        }

        b = b.replaceAll("[.;]+$", "").trim();
        if (!b.isEmpty()) {
            b = Character.toUpperCase(b.charAt(0)) + b.substring(1);
        }
        return b;
    }

    private static String firstWord(String s) {
        String trimmed = s.trim();
        int space = trimmed.indexOf(' ');
        String word = space < 0 ? trimmed : trimmed.substring(0, space);
        return word.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
    }
}
