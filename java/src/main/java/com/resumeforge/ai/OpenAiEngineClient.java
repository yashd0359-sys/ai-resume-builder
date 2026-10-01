package com.resumeforge.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.resumeforge.model.Models.AtsScore;
import com.resumeforge.model.Models.Breakdown;
import com.resumeforge.model.Models.Education;
import com.resumeforge.model.Models.EngineOutput;
import com.resumeforge.model.Models.Feedback;
import com.resumeforge.model.Models.ResumeContent;
import com.resumeforge.model.Models.Skills;
import com.resumeforge.model.Models.WorkExperience;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Calls any OpenAI-compatible chat-completions endpoint with the engine prompt, then
 * validates the reply against the strict JSON contract.
 *
 * <p>If the key is missing, the call fails, or the model returns malformed JSON, this
 * returns {@link Optional#empty()} so the caller can fall back to the deterministic engine.
 */
@Component
public class OpenAiEngineClient {

    private static final Logger log = LoggerFactory.getLogger(OpenAiEngineClient.class);

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public OpenAiEngineClient(@Value("${resumeforge.openai.api-key:${OPENAI_API_KEY:}}") String apiKey,
                              @Value("${resumeforge.openai.base-url:https://api.openai.com/v1}") String baseUrl,
                              @Value("${resumeforge.openai.model:gpt-4o-mini}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.model = model;
    }

    public boolean isEnabled() {
        return !apiKey.isEmpty();
    }

    public Optional<EngineOutput> generate(String rawResume, String jobDescription) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            body.put("temperature", 0.3);
            body.putObject("response_format").put("type", "json_object");
            ArrayNode messages = body.putArray("messages");
            messages.addObject().put("role", "system").put("content", PromptTemplates.SYSTEM_PROMPT);
            messages.addObject().put("role", "user")
                    .put("content", PromptTemplates.userMessage(rawResume, jobDescription));

            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                    .timeout(Duration.ofSeconds(90))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("LLM call failed with status {}", response.statusCode());
                return Optional.empty();
            }

            String content = mapper.readTree(response.body())
                    .path("choices").path(0).path("message").path("content").asText("");
            String cleaned = content.replaceAll("(?is)^```(?:json)?\\s*", "").replaceAll("```\\s*$", "").trim();
            if (cleaned.isEmpty()) {
                return Optional.empty();
            }
            return normalise(mapper.readTree(cleaned));
        } catch (Exception e) {
            log.warn("LLM generation failed, falling back to the local engine: {}", e.toString());
            return Optional.empty();
        }
    }

    /** Coerces untrusted model output into the strict contract, recomputing the overall score. */
    Optional<EngineOutput> normalise(JsonNode root) {
        if (root == null || !root.has("ats_score") || !root.has("resume_content")) {
            return Optional.empty();
        }
        JsonNode scoreNode = root.path("ats_score");
        JsonNode b = scoreNode.path("breakdown");
        Breakdown breakdown = new Breakdown(
                b.path("keyword_match").asInt(0),
                b.path("impact_metrics").asInt(0),
                b.path("formatting_readability").asInt(0),
                b.path("role_relevance").asInt(0));

        JsonNode feedbackNode = scoreNode.path("feedback");
        Feedback feedback = new Feedback(
                limit(strings(feedbackNode.path("strengths")), 3),
                limit(strings(feedbackNode.path("gaps_or_missing_keywords")), 5));

        JsonNode rc = root.path("resume_content");
        List<WorkExperience> work = new ArrayList<>();
        for (JsonNode w : rc.path("work_experience")) {
            work.add(new WorkExperience(
                    w.path("company").asText(""),
                    w.path("role").asText(""),
                    w.path("duration").asText(""),
                    strings(w.path("achievements"))));
        }

        String summary = rc.path("professional_summary").asText("").trim();
        if (summary.isEmpty() && work.isEmpty()) {
            return Optional.empty();
        }

        List<Education> education = new ArrayList<>();
        for (JsonNode e : rc.path("education")) {
            education.add(new Education(
                    e.path("institution").asText(""),
                    e.path("degree").asText(""),
                    e.path("graduation_year").asText("")));
        }

        Skills skills = new Skills(
                strings(rc.path("skills").path("technical_skills")),
                strings(rc.path("skills").path("soft_skills_and_methodologies")));

        return Optional.of(new EngineOutput(
                AtsScore.of(breakdown, feedback),
                new ResumeContent(summary, skills, work, education)));
    }

    private static List<String> strings(JsonNode node) {
        List<String> out = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(n -> {
                String s = n.asText("").trim();
                if (!s.isEmpty()) {
                    out.add(s);
                }
            });
        }
        return out;
    }

    private static List<String> limit(List<String> items, int max) {
        return items.size() <= max ? items : items.subList(0, max);
    }
}
