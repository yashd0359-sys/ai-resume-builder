package com.resumeforge.web;

import com.resumeforge.model.Models.GenerateRequest;
import com.resumeforge.model.Models.GenerateResponse;
import com.resumeforge.service.ResumeService;
import com.resumeforge.store.ResumeStore;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * REST API mirroring the Next.js routes, so the front end can call either backend:
 * <ul>
 *   <li>{@code POST /api/generate}</li>
 *   <li>{@code GET  /api/resumes}</li>
 *   <li>{@code GET  /api/resumes/{id}}</li>
 *   <li>{@code DELETE /api/resumes/{id}}</li>
 *   <li>{@code GET  /api/health}</li>
 * </ul>
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ResumeController {

    private final ResumeService service;
    private final ResumeStore store;

    public ResumeController(ResumeService service, ResumeStore store) {
        this.service = service;
        this.store = store;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "engine", "java");
    }

    @PostMapping("/generate")
    public GenerateResponse generate(@RequestBody GenerateRequest request) {
        return service.generate(request);
    }

    @GetMapping("/resumes")
    public Map<String, List<ResumeStore.Summary>> list() {
        return Map.of("resumes", store.findAll());
    }

    @GetMapping("/resumes/{id}")
    public ResponseEntity<?> get(@PathVariable long id) {
        return store.findById(id)
                .<ResponseEntity<?>>map(row -> ResponseEntity.ok(Map.of("resume", row)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Not found")));
    }

    @DeleteMapping("/resumes/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        store.delete(id);
        return Map.of("ok", true);
    }

    @ExceptionHandler(ResumeService.InvalidInputException.class)
    public ResponseEntity<Map<String, String>> handleInvalidInput(ResumeService.InvalidInputException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
