package com.resumeforge.engine;

import com.resumeforge.model.Models.EngineOutput;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Dependency-free CLI demo of the engine. Compile and run with nothing but a JDK 17+:
 *
 * <pre>
 * cd java
 * javac -d out $(find src/main/java/com/resumeforge/engine src/main/java/com/resumeforge/model -name '*.java')
 * java -cp out com.resumeforge.engine.Main                      # built-in sample
 * java -cp out com.resumeforge.engine.Main resume.txt job.txt   # your own files
 * cat resume.txt job.txt | java -cp out com.resumeforge.engine.Main -   # stdin, '---' separated
 * </pre>
 *
 * <p>Prints the strict JSON contract to stdout and nothing else, so it can be piped
 * directly into other tools.
 */
public final class Main {

    private static final String SAMPLE_RESUME = """
            Work Experience
            Software Engineer at BrightPay, Austin TX | Jan 2021 - Present
            - Responsible for building backend services in Node.js and PostgreSQL for the payments platform
            - Reduced API latency by 38% by adding Redis caching and optimizing SQL queries
            - Worked on migrating 12 services to Docker and Kubernetes on AWS
            - Mentored 3 junior developers and ran weekly code reviews

            Junior Developer, Cloudlane Inc | Jun 2018 - Dec 2020
            - Helped build React dashboards used by 2,500 customers
            - Wrote REST APIs in Python and Flask
            - Handled bug fixes and on-call support

            Education
            B.S. Computer Science, University of Texas at Austin, 2018

            Skills
            JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Redis, Docker, AWS, Git, Agile
            """;

    private static final String SAMPLE_JD = """
            Senior Full-Stack Engineer

            We are looking for a Senior Full-Stack Engineer with 5+ years of experience building scalable web
            applications. You will design REST APIs and GraphQL services in TypeScript and Node.js, build React
            front-ends, and own CI/CD pipelines on AWS using Docker and Kubernetes.

            Requirements:
            - Strong experience with PostgreSQL, Redis and microservices architecture
            - Experience with Terraform and infrastructure as code
            - Agile / Scrum delivery, code review and mentoring of engineers
            - Excellent communication and cross-functional collaboration
            """;

    private Main() {
    }

    public static void main(String[] args) throws IOException {
        String resume;
        String jobDescription;

        if (args.length >= 2) {
            resume = Files.readString(Path.of(args[0]), StandardCharsets.UTF_8);
            jobDescription = Files.readString(Path.of(args[1]), StandardCharsets.UTF_8);
        } else if (args.length == 1 && args[0].equals("-")) {
            String[] parts = readStdin().split("(?m)^---\\s*$", 2);
            if (parts.length < 2) {
                System.err.println("Expected resume and job description separated by a line containing '---'.");
                System.exit(2);
                return;
            }
            resume = parts[0];
            jobDescription = parts[1];
        } else {
            resume = SAMPLE_RESUME;
            jobDescription = SAMPLE_JD;
        }

        EngineOutput output = AtsEngine.generate(resume, jobDescription);
        System.out.println(Json.write(output));
    }

    private static String readStdin() throws IOException {
        try (InputStream in = System.in) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
