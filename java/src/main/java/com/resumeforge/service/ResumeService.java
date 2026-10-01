package com.resumeforge.service;

import com.resumeforge.ai.OpenAiEngineClient;
import com.resumeforge.engine.AtsEngine;
import com.resumeforge.engine.JobDescriptionAnalyzer;
import com.resumeforge.model.Models.Candidate;
import com.resumeforge.model.Models.EngineOutput;
import com.resumeforge.model.Models.GenerateRequest;
import com.resumeforge.model.Models.GenerateResponse;
import com.resumeforge.store.ResumeStore;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Orchestrates generation: try the LLM first (full Google XYZ / CAR rewrites), fall back to
 * the deterministic {@link AtsEngine}, then persist the result.
 */
@Service
public class ResumeService {

    private static final int MAX_RESUME_CHARS = 20_000;
    private static final int MAX_JD_CHARS = 15_000;

    private final OpenAiEngineClient llm;
    private final ResumeStore store;

    public ResumeService(OpenAiEngineClient llm, ResumeStore store) {
        this.llm = llm;
        this.store = store;
    }

    /** Thrown for user-correctable input problems; mapped to HTTP 400. */
    public static class InvalidInputException extends RuntimeException {
        public InvalidInputException(String message) {
            super(message);
        }
    }

    public GenerateResponse generate(GenerateRequest request) {
        String rawResume = clean(request == null ? null : request.rawResume(), MAX_RESUME_CHARS);
        String jobDescription = clean(request == null ? null : request.jobDescription(), MAX_JD_CHARS);

        if (rawResume.length() < 40) {
            throw new InvalidInputException("Please paste your resume or career details (at least a few lines).");
        }
        if (jobDescription.length() < 30) {
            throw new InvalidInputException("Please paste the target job description.");
        }

        Candidate candidate = normalise(request.candidate());

        Optional<EngineOutput> ai = llm.generate(rawResume, jobDescription);
        EngineOutput output = ai.orElseGet(() -> AtsEngine.generate(rawResume, jobDescription));
        String engine = ai.isPresent() ? "ai" : "local";

        String jdTitle = JobDescriptionAnalyzer.analyze(jobDescription).title();
        String title = !jdTitle.isBlank()
                ? jdTitle
                : output.resume_content().work_experience().stream()
                        .findFirst().map(w -> w.role()).filter(r -> !r.isBlank())
                        .orElse("Tailored resume");
        title = title.substring(0, Math.min(120, title.length()));

        Long id = store.save(title, engine, output.ats_score().overall(), candidate, rawResume, jobDescription, output);
        return new GenerateResponse(id, title, engine, candidate, output);
    }

    private static Candidate normalise(Candidate c) {
        if (c == null) {
            return Candidate.empty();
        }
        return new Candidate(clean(c.name(), 120), clean(c.email(), 120), clean(c.phone(), 60),
                clean(c.location(), 120), clean(c.links(), 240));
    }

    private static String clean(String value, int max) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
