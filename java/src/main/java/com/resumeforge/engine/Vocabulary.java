package com.resumeforge.engine;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Shared skill dictionaries, stop words and regex patterns used across the engine. */
public final class Vocabulary {

    private Vocabulary() {
    }

    public static final List<String> TECH_SKILLS = List.of(
            "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Golang", "Rust", "Ruby", "PHP", "Swift",
            "Kotlin", "Scala", "SQL", "NoSQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
            "React", "Next.js", "Node.js", "Angular", "Vue", "Django", "Flask", "FastAPI", "Spring Boot", ".NET",
            "Express", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "CI/CD", "Jenkins",
            "Git", "GitHub Actions", "GraphQL", "REST APIs", "Microservices", "API Design", "System Design",
            "Distributed Systems", "Machine Learning", "Deep Learning", "NLP", "LLMs", "TensorFlow", "PyTorch",
            "scikit-learn", "Pandas", "NumPy", "Tableau", "Power BI", "Excel", "Looker", "Snowflake", "Spark",
            "Kafka", "Airflow", "dbt", "ETL", "Data Analysis", "Data Modeling", "Data Visualization", "Statistics",
            "A/B Testing", "SEO", "SEM", "Google Analytics", "HubSpot", "Salesforce", "CRM", "Content Marketing",
            "Email Marketing", "Lead Generation", "Figma", "Sketch", "UX Research", "User Research", "Wireframing",
            "Prototyping", "Jira", "Product Roadmap", "Budgeting", "Forecasting", "Financial Modeling", "GAAP",
            "P&L", "QuickBooks", "SAP", "ERP", "Supply Chain", "Logistics", "Recruiting", "Talent Acquisition",
            "HRIS", "Compliance", "Risk Management", "HTML", "CSS", "Tailwind CSS", "Sass", "Webpack", "Jest",
            "Cypress", "Selenium", "Linux", "Bash", "DevOps", "SRE", "Datadog", "Prometheus", "Grafana", "OAuth",
            "Security", "React Native", "Flutter", "iOS", "Android", "Customer Success", "Account Management",
            "Negotiation");

    public static final List<String> SOFT_AND_METHODS = List.of(
            "Agile", "Scrum", "Kanban", "Lean", "Six Sigma", "OKRs", "KPIs", "TDD", "Stakeholder Management",
            "Project Management", "Cross-functional Collaboration", "Leadership", "Mentoring", "Communication",
            "Problem Solving", "Strategic Planning", "Code Review", "Process Improvement", "Change Management",
            "Public Speaking", "Time Management");

    public static final List<String> ALL_TERMS =
            java.util.stream.Stream.concat(TECH_SKILLS.stream(), SOFT_AND_METHODS.stream()).toList();

    public static final Set<String> SOFT_SET =
            SOFT_AND_METHODS.stream().map(s -> s.toLowerCase(Locale.ROOT)).collect(Collectors.toUnmodifiableSet());

    public static final Set<String> STOP_WORDS = Arrays.stream(("""
            a about above after again all also an and any are as at be because been before being below between both \
            but by can could did do does doing down during each few for from further had has have having he her here \
            hers him his how i if in into is it its just me more most my no nor not now of off on once only or other \
            our out over own same she should so some such than that the their them then there these they this those \
            through to too under until up us very was we were what when where which while who whom why will with \
            would you your experience experienced years year work working ability strong skills skill team teams role \
            roles job company candidate candidates required requirements preferred responsibilities responsibility \
            including include plus must will good great excellent proven demonstrated knowledge understanding looking \
            join opportunity position seeking environment business new using use used well etc across within ensure \
            support help build develop develops related equivalent degree bachelor master benefits salary apply about \
            love every make like need needs able high highly day days people part full time based key best our\
            """).split("\\s+")).collect(Collectors.toUnmodifiableSet());

    public static final Pattern TITLE_PATTERN = Pattern.compile(
            "\\b(engineer|developer|manager|analyst|designer|architect|consultant|specialist|director|lead"
                    + "|coordinator|administrator|scientist|associate|intern|officer|executive|assistant"
                    + "|representative|technician|programmer|strategist|marketer|accountant|recruiter|producer"
                    + "|editor|writer|teacher|nurse|head|vp|president|founder|owner|supervisor|researcher)\\b",
            Pattern.CASE_INSENSITIVE);

    public static final String MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";

    public static final Pattern DATE_RANGE = Pattern.compile(
            "((?:" + MONTH + "\\s+)?(?:19|20)\\d{2})\\s*(?:-|\u2013|\u2014|to)\\s*"
                    + "(present|current|now|(?:" + MONTH + "\\s+)?(?:19|20)\\d{2})",
            Pattern.CASE_INSENSITIVE);

    public static final Pattern DEGREE = Pattern.compile(
            "\\b(bachelor|master|doctor|ph\\.?d|mba|b\\.?\\s?sc?\\.?|m\\.?\\s?sc?\\.?|b\\.?\\s?tech|m\\.?\\s?tech"
                    + "|b\\.?a\\.?|m\\.?a\\.?|b\\.?eng|associate|diploma|certificate|licentiate)\\b",
            Pattern.CASE_INSENSITIVE);

    public static final Pattern INSTITUTION = Pattern.compile(
            "\\b(university|college|institute|school|academy|polytechnic|iit|mit)\\b", Pattern.CASE_INSENSITIVE);

    public static final Pattern BULLET = Pattern.compile("^\\s*[-\u2022*\u25aa\u25cf\u25e6\u2013\u00b7\u27a2\u2713]\\s*");

    /** Quotes regex metacharacters so a skill such as "C++" or ".NET" can be matched literally. */
    public static String escapeRegex(String s) {
        return s.replaceAll("([.*+?^${}()|\\[\\]\\\\/])", "\\\\$1");
    }

    /** Whole-term, case-insensitive containment check that tolerates +, # and . inside skill names. */
    public static boolean hasTerm(String text, String term) {
        if (text == null || text.isBlank() || term == null || term.isBlank()) {
            return false;
        }
        Pattern p = Pattern.compile("(^|[^a-z0-9+#.])" + escapeRegex(term.toLowerCase(Locale.ROOT)) + "($|[^a-z0-9+#])",
                Pattern.CASE_INSENSITIVE);
        return p.matcher(text.toLowerCase(Locale.ROOT)).find();
    }

    /** Case-insensitive de-duplication that preserves insertion order. */
    public static List<String> uniqueIgnoreCase(List<String> values) {
        Set<String> seen = new LinkedHashSet<>();
        return values.stream()
                .filter(v -> v != null && !v.isBlank())
                .filter(v -> seen.add(v.toLowerCase(Locale.ROOT)))
                .toList();
    }

    public static int wordCount(String s) {
        if (s == null || s.isBlank()) {
            return 0;
        }
        return s.trim().split("\\s+").length;
    }

    public static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    /** "a, b and c" */
    public static String joinList(List<String> items) {
        if (items.isEmpty()) {
            return "";
        }
        if (items.size() == 1) {
            return items.get(0);
        }
        return String.join(", ", items.subList(0, items.size() - 1)) + " and " + items.get(items.size() - 1);
    }
}
