package com.resumeforge.engine;

import com.resumeforge.model.Models.EngineOutput;
import com.resumeforge.model.Models.WorkExperience;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AtsEngineTest {

    private static final String RESUME = """
            Work Experience
            Software Engineer at BrightPay, Austin TX | Jan 2021 - Present
            - Responsible for building backend services in Node.js and PostgreSQL
            - Reduced API latency by 38% by adding Redis caching
            - Helped build React dashboards used by 2,500 customers

            Education
            B.S. Computer Science, University of Texas at Austin, 2018

            Skills
            TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS, Agile
            """;

    private static final String JD = """
            Senior Full-Stack Engineer
            5+ years building web apps with TypeScript, Node.js, React, PostgreSQL, Redis,
            Docker, Kubernetes and Terraform. Agile delivery and code review.
            """;

    @Test
    void overallScoreEqualsSumOfPillars() {
        EngineOutput out = AtsEngine.generate(RESUME, JD);
        var b = out.ats_score().breakdown();
        assertEquals(b.keyword_match() + b.impact_metrics() + b.formatting_readability() + b.role_relevance(),
                out.ats_score().overall());
        assertTrue(out.ats_score().overall() >= 0 && out.ats_score().overall() <= 100);
    }

    @Test
    void pillarsRespectTheirMaximums() {
        var b = AtsEngine.generate(RESUME, JD).ats_score().breakdown();
        assertTrue(b.keyword_match() <= 30);
        assertTrue(b.impact_metrics() <= 30);
        assertTrue(b.formatting_readability() <= 20);
        assertTrue(b.role_relevance() <= 20);
    }

    @Test
    void parsesCompanyRoleAndDuration() {
        WorkExperience job = AtsEngine.generate(RESUME, JD).resume_content().work_experience().get(0);
        assertEquals("BrightPay", job.company());
        assertEquals("Software Engineer", job.role());
        assertTrue(job.duration().contains("Present"));
    }

    @Test
    void rewritesPassiveOpenersIntoActionVerbs() {
        assertEquals("Managed email campaigns", BulletRewriter.rewrite("Responsible for managing email campaigns"));
        assertEquals("Managed email campaigns", BulletRewriter.rewrite("Was responsible for managing email campaigns"));
        assertEquals("Built React dashboards", BulletRewriter.rewrite("Helped build React dashboards"));
        assertEquals("Wrote blog posts", BulletRewriter.rewrite("Helped to write blog posts."));
    }

    @Test
    void neverInventsEducationOrJobs() {
        EngineOutput out = AtsEngine.generate(RESUME, JD);
        assertEquals(1, out.resume_content().education().size());
        assertEquals("2018", out.resume_content().education().get(0).graduation_year());
        assertEquals(1, out.resume_content().work_experience().size());
    }

    @Test
    void identifiesMissingKeywordsFromTheJobDescription() {
        var gaps = AtsEngine.generate(RESUME, JD).ats_score().feedback().gaps_or_missing_keywords();
        assertTrue(gaps.stream().anyMatch(g -> g.equalsIgnoreCase("Kubernetes") || g.equalsIgnoreCase("Terraform")));
    }

    @Test
    void emitsValidJsonForTheStrictContract() {
        String json = Json.write(AtsEngine.generate(RESUME, JD));
        assertTrue(json.startsWith("{"));
        assertTrue(json.contains("\"ats_score\""));
        assertTrue(json.contains("\"resume_content\""));
        assertTrue(json.contains("\"gaps_or_missing_keywords\""));
        assertFalse(json.contains("\n\"\n"));
    }
}
