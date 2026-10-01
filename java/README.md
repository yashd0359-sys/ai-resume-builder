# ResumeForge AI — Java Engine

A complete Java implementation of the AI Resume Builder engine: it takes raw career
details plus a target job description and returns an ATS-optimized resume with a strict
ATS Optimization Score, in the exact JSON contract required by the spec.

## Layout

```
java/
├── pom.xml
└── src/
    ├── main/java/com/resumeforge/
    │   ├── ResumeForgeApplication.java      Spring Boot entry point
    │   ├── model/Models.java                Records for the strict JSON contract
    │   ├── engine/
    │   │   ├── AtsEngine.java               Orchestration + 100-point scoring rubric
    │   │   ├── JobDescriptionAnalyzer.java  Title, keywords, required years
    │   │   ├── ResumeParser.java            Free-text → jobs / education / skills
    │   │   ├── BulletRewriter.java          Passive duties → action-verb achievements
    │   │   ├── Vocabulary.java              Skill dictionaries, stop words, regexes
    │   │   ├── Json.java                    Dependency-free JSON writer
    │   │   └── Main.java                    CLI demo
    │   ├── ai/
    │   │   ├── PromptTemplates.java         The verbatim engine system prompt
    │   │   └── OpenAiEngineClient.java      LLM call + strict output validation
    │   ├── service/ResumeService.java       LLM-first, deterministic fallback
    │   ├── store/ResumeStore.java           PostgreSQL persistence
    │   └── web/ResumeController.java        REST API
    ├── main/resources/application.yml
    └── test/java/com/resumeforge/engine/AtsEngineTest.java
```

## Run the engine with only a JDK (no Maven, no dependencies)

```bash
cd java
javac -d out $(find src/main/java/com/resumeforge/engine src/main/java/com/resumeforge/model -name '*.java')
java -cp out com.resumeforge.engine.Main                      # built-in sample
java -cp out com.resumeforge.engine.Main resume.txt job.txt   # your own files
```

It prints only the strict JSON object, so you can pipe it straight into other tools.

## Run the REST API

```bash
cd java
mvn spring-boot:run
```

| Method | Endpoint             | Purpose                              |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/generate`      | Optimize + score a resume            |
| GET    | `/api/resumes`       | List the 50 most recent resumes      |
| GET    | `/api/resumes/{id}`  | Fetch one saved resume               |
| DELETE | `/api/resumes/{id}`  | Delete a saved resume                |
| GET    | `/api/health`        | Health check                         |

```bash
curl -X POST localhost:8080/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"rawResume":"Software Engineer at Foo | 2020 - Present\n- Responsible for cutting build time by 40%","jobDescription":"Backend Engineer. Java, Spring Boot, Kubernetes required."}'
```

## Configuration

| Variable            | Default                                    | Purpose                               |
| ------------------- | ------------------------------------------ | ------------------------------------- |
| `OPENAI_API_KEY`    | *(empty)*                                  | Enables full Google-XYZ / CAR rewrites |
| `OPENAI_BASE_URL`   | `https://api.openai.com/v1`                | Any OpenAI-compatible endpoint        |
| `OPENAI_MODEL`      | `gpt-4o-mini`                              | Model name                            |
| `JDBC_DATABASE_URL` | `jdbc:postgresql://127.0.0.1:5432/app_db`  | Postgres connection                   |
| `PORT`              | `8080`                                     | HTTP port                             |

Without an API key the service runs the deterministic `AtsEngine`, which cleans and
strengthens bullets but never invents facts or metrics.

## Using it as the backend for the Next.js front end

Set `JAVA_BACKEND_URL=http://localhost:8080` in the Next.js `.env`. The route at
`src/app/api/generate/route.ts` will proxy to this service instead of using the
TypeScript engine. Both backends share the same `resumes` table and the same JSON shape.

## Tests

```bash
cd java && mvn test
```

Covers: overall score equals the sum of the four pillars, pillar maximums, parsing of
company/role/duration, passive-to-action bullet rewriting, the no-fabrication rule, and
JSON contract validity.
