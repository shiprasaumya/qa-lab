export type QaTemplateType = "requirement" | "bug" | "exploratory" | "api";

export type QaAnalyzeResponse = {
  detected_type: string;
  detected_domain: string;
  input_quality?: string;
  key_entities: string[];
  coverage_possible: string[];
  missing_information: string[];
  suggestion_to_improve: string;
  assistant_message: string;
};

export type QaTestCase = {
  id: string;
  title: string;
  objective: string;
  priority: string;
  preconditions: string[];
  test_data: string[];
  steps: string[];
  expected_results: string[];
  automation_candidate: boolean;
  tags: string[];
};

export type QaApiTest = {
  id: string;
  title: string;
  endpoint: string;
  method: string;
  scenario: string;
  request_data: string[];
  expected_status: string;
  expected_response_checks: string[];
  negative_checks: string[];
  automation_candidate: boolean;
};

export type QaAutomationIdea = {
  id: string;
  title: string;
  why_it_matters: string;
  approach: string;
  priority: string;
};

export type QaGeneratedOutput = {
  detected_type: string;
  detected_domain: string;
  input_quality: string;
  generation_quality: string;
  conversational_summary: string;
  what_ai_understood: string[];
  missing_information: string[];
  recommendation_prompt: string;
  fail_reasons: string[];
  test_cases: QaTestCase[];
  edge_cases: string[];
  api_tests: QaApiTest[];
  automation_ideas: QaAutomationIdea[];
  qa_notes: string[];
};

export type QaScoreBreakdown = {
  requirement_understanding: number;
  functional_coverage: number;
  edge_cases: number;
  negative_cases: number;
  api_coverage: number;
  clarity: number;
  automation_ready: number;
};

export type QaReview = {
  total_score: number;
  score_breakdown: QaScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  missing_items: string[];
  how_to_improve: string[];
  summary: string;
  pass_status: "pass" | "needs_review" | "fail";
  fail_reasons: string[];
  quality_label: string;
};

export type QaGenerateResponse = {
  analysis: QaAnalyzeResponse;
  output: QaGeneratedOutput;
  review?: QaReview | null;
};

export type QaGenerateRequest = {
  input_text: string;
  input_mode: string;
  selected_template?: string;
  project_name?: string;
  capture_title?: string;
  file_names?: string[];
  attached_context?: string[];
  run_review?: boolean;
  generate_scope?: "all" | "test_cases" | "api_tests" | "review_only";
};
