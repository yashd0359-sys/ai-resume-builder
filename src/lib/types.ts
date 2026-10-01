export interface AtsScore {
  overall: number;
  breakdown: {
    keyword_match: number;
    impact_metrics: number;
    formatting_readability: number;
    role_relevance: number;
  };
  feedback: {
    strengths: string[];
    gaps_or_missing_keywords: string[];
  };
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  degree: string;
  graduation_year: string;
}

export interface ResumeContent {
  professional_summary: string;
  skills: {
    technical_skills: string[];
    soft_skills_and_methodologies: string[];
  };
  work_experience: WorkExperience[];
  education: Education[];
}

/** Exact JSON contract returned by the engine. */
export interface EngineOutput {
  ats_score: AtsScore;
  resume_content: ResumeContent;
}

export interface Candidate {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string;
}

export interface GenerateRequest {
  rawResume: string;
  jobDescription: string;
  candidate?: Partial<Candidate>;
}

export interface SavedResumeSummary {
  id: number;
  title: string;
  engine: string;
  overallScore: number;
  createdAt: string;
}

export interface SavedResume extends SavedResumeSummary {
  candidate: Candidate;
  rawInput: string;
  jobDescription: string;
  result: EngineOutput;
}
