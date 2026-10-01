package com.resumeforge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring Boot entry point for the ResumeForge AI Java backend.
 *
 * <pre>
 * mvn spring-boot:run
 * curl -X POST localhost:8080/api/generate \
 *   -H 'Content-Type: application/json' \
 *   -d '{"rawResume":"...","jobDescription":"..."}'
 * </pre>
 */
@SpringBootApplication
public class ResumeForgeApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResumeForgeApplication.class, args);
    }
}
