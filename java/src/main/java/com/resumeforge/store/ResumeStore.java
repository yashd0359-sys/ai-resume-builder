package com.resumeforge.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.resumeforge.model.Models.Candidate;
import com.resumeforge.model.Models.EngineOutput;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** PostgreSQL persistence for generated resumes (same table the Next.js app uses). */
@Repository
public class ResumeStore {

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper = new ObjectMapper();

    public ResumeStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS resumes (
                  id SERIAL PRIMARY KEY,
                  title TEXT NOT NULL,
                  engine TEXT NOT NULL DEFAULT 'local',
                  overall_score INTEGER NOT NULL DEFAULT 0,
                  candidate JSONB NOT NULL,
                  raw_input TEXT NOT NULL,
                  job_description TEXT NOT NULL,
                  result JSONB NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """);
    }

    public record Summary(long id, String title, String engine, int overallScore, Timestamp createdAt) {
    }

    /** Saving is best-effort: a storage failure must never lose the generated resume. */
    public Long save(String title, String engine, int overallScore, Candidate candidate,
                     String rawInput, String jobDescription, EngineOutput result) {
        try {
            String candidateJson = mapper.writeValueAsString(candidate);
            String resultJson = mapper.writeValueAsString(result);
            KeyHolder keys = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement("""
                        INSERT INTO resumes (title, engine, overall_score, candidate, raw_input, job_description, result)
                        VALUES (?, ?, ?, ?::jsonb, ?, ?, ?::jsonb)
                        """, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, title);
                ps.setString(2, engine);
                ps.setInt(3, overallScore);
                ps.setString(4, candidateJson);
                ps.setString(5, rawInput);
                ps.setString(6, jobDescription);
                ps.setString(7, resultJson);
                return ps;
            }, keys);
            Number id = (Number) keys.getKeys().get("id");
            return id == null ? null : id.longValue();
        } catch (Exception e) {
            return null;
        }
    }

    public List<Summary> findAll() {
        return jdbc.query("""
                SELECT id, title, engine, overall_score, created_at
                FROM resumes ORDER BY created_at DESC LIMIT 50
                """, (rs, i) -> new Summary(rs.getLong("id"), rs.getString("title"), rs.getString("engine"),
                rs.getInt("overall_score"), rs.getTimestamp("created_at")));
    }

    public Optional<Map<String, Object>> findById(long id) {
        return jdbc.query("SELECT * FROM resumes WHERE id = ?", (rs, i) -> {
            Map<String, Object> row = new java.util.LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("title", rs.getString("title"));
            row.put("engine", rs.getString("engine"));
            row.put("overallScore", rs.getInt("overall_score"));
            row.put("candidate", rs.getString("candidate"));
            row.put("rawInput", rs.getString("raw_input"));
            row.put("jobDescription", rs.getString("job_description"));
            row.put("result", rs.getString("result"));
            row.put("createdAt", rs.getTimestamp("created_at"));
            return row;
        }, id).stream().findFirst();
    }

    public void delete(long id) {
        jdbc.update("DELETE FROM resumes WHERE id = ?", id);
    }
}
