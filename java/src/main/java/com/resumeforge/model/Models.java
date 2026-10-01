package com.resumeforge.model;

import java.util.List;

/**
 * The strict data contract returned by the AI Resume Builder engine.
 *
 * <p>These records serialise to exactly the JSON structure required by the engine
 * specification:
 *
 * <pre>
 * {
 *   "ats_score": { "overall": 85, "breakdown": {...}, "feedback": {...} },
 *   "resume_content": { "professional_summary": "...", "skills": {...},
 *                       "work_experience": [...], "education": [...] }
 * }
 * </pre>
 */
public final class Models {

    private Models() {
    }

    /** Scoring breakdown. Max values: 30 / 30 / 20 / 20. */
    public record Breakdown(int keyword_match, int impact_metrics, int formatting_readability, int role_relevance) {

        public Breakdown {
            keyword_match = clamp(keyword_match, 30);
            impact_metrics = clamp(impact_metrics, 30);
            formatting_readability = clamp(formatting_readability, 20);
            role_relevance = clamp(role_relevance, 20);
        }

        private static int clamp(int v, int max) {
            return Math.max(0, Math.min(max, v));
        }

        /** The overall score is always the sum of the four pillars. */
        public int total() {
            return keyword_match + impact_metrics + formatting_readability + role_relevance;
        }
    }

    public record Feedback(List<String> strengths, List<String> gaps_or_missing_keywords) {
    }

    public record AtsScore(int overall, Breakdown breakdown, Feedback feedback) {

        public static AtsScore of(Breakdown breakdown, Feedback feedback) {
            return new AtsScore(breakdown.total(), breakdown, feedback);
        }
    }

    public record Skills(List<String> technical_skills, List<String> soft_skills_and_methodologies) {
    }

    public record WorkExperience(String company, String role, String duration, List<String> achievements) {
    }

    public record Education(String institution, String degree, String graduation_year) {
    }

    public record ResumeContent(String professional_summary,
                                Skills skills,
                                List<WorkExperience> work_experience,
                                List<Education> education) {
    }

    /** Top-level engine output. */
    public record EngineOutput(AtsScore ats_score, ResumeContent resume_content) {
    }

    /* ----- Request-side models ----- */

    public record Candidate(String name, String email, String phone, String location, String links) {

        public static Candidate empty() {
            return new Candidate("", "", "", "", "");
        }
    }

    public record GenerateRequest(String rawResume, String jobDescription, Candidate candidate) {
    }

    public record GenerateResponse(Long id, String title, String engine, Candidate candidate, EngineOutput result) {
    }
}
