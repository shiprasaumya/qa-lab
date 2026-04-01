import json
import os
import re
from typing import Any, Dict, List, Optional, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # type: ignore


APP_TITLE = "TestMind AI Backend"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

app = FastAPI(title=APP_TITLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_openai_client() -> Optional["OpenAI"]:
    if not OPENAI_API_KEY or OpenAI is None:
        return None
    return OpenAI(api_key=OPENAI_API_KEY)


# -------------------------------------------------
# Models
# -------------------------------------------------


class AnalyzeRequest(BaseModel):
    input_text: str = Field(..., alias="input")
    selected_template: Optional[str] = None
    project_name: Optional[str] = None
    capture_title: Optional[str] = None


class ImproveInputRequest(BaseModel):
    input_text: str
    selected_template: Optional[str] = None
    project_name: Optional[str] = None
    capture_title: Optional[str] = None


class GenerateRequest(BaseModel):
    input_text: str
    input_mode: str = "manual"
    selected_template: Optional[str] = None
    project_name: Optional[str] = None
    capture_title: Optional[str] = None
    file_names: List[str] = []
    attached_context: List[str] = []
    run_review: bool = True
    generate_scope: Literal["all", "test_cases", "api_tests", "review_only"] = "all"


class ReviewRequest(BaseModel):
    output: Dict[str, Any]
    original_input: Optional[str] = None
    selected_template: Optional[str] = None


class ImproveInputResponse(BaseModel):
    improved_input: str
    improvement_notes: List[str]
    input_quality_before: str
    input_quality_after: str
    assistant_message: str


class ScoreBreakdown(BaseModel):
    requirement_understanding: int
    functional_coverage: int
    edge_cases: int
    negative_cases: int
    api_coverage: int
    clarity: int
    automation_ready: int


class TestCaseItem(BaseModel):
    id: str
    title: str
    objective: str
    priority: str
    preconditions: List[str]
    test_data: List[str]
    steps: List[str]
    expected_results: List[str]
    automation_candidate: bool
    tags: List[str]


class ApiTestItem(BaseModel):
    id: str
    title: str
    endpoint: str
    method: str
    scenario: str
    request_data: List[str]
    expected_status: str
    expected_response_checks: List[str]
    negative_checks: List[str]
    automation_candidate: bool


class AutomationIdeaItem(BaseModel):
    id: str
    title: str
    why_it_matters: str
    approach: str
    priority: str


class GeneratedQaOutput(BaseModel):
    detected_type: str
    detected_domain: str
    input_quality: str
    generation_quality: str
    conversational_summary: str
    what_ai_understood: List[str]
    missing_information: List[str]
    recommendation_prompt: str
    fail_reasons: List[str]
    test_cases: List[TestCaseItem]
    edge_cases: List[str]
    api_tests: List[ApiTestItem]
    automation_ideas: List[AutomationIdeaItem]
    qa_notes: List[str]


class ReviewOutput(BaseModel):
    total_score: int
    score_breakdown: ScoreBreakdown
    strengths: List[str]
    weaknesses: List[str]
    missing_items: List[str]
    how_to_improve: List[str]
    summary: str
    pass_status: str
    fail_reasons: List[str]
    quality_label: str


class GenerateResponse(BaseModel):
    analysis: Dict[str, Any]
    output: GeneratedQaOutput
    review: Optional[ReviewOutput] = None


# -------------------------------------------------
# Helpers
# -------------------------------------------------


def strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def parse_json_response(raw: str) -> Dict[str, Any]:
    cleaned = strip_code_fences(raw)
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def normalize_score(value: int, min_value: int, max_value: int) -> int:
    return max(min_value, min(max_value, int(value)))


def fallback_detect_type(text: str, selected_template: Optional[str]) -> str:
    source = f"{selected_template or ''} {text}".lower()
    if "endpoint" in source or "status code" in source or "api" in source:
        return "api"
    if "bug" in source or "actual result" in source or "steps to reproduce" in source:
        return "bug"
    if "session title" in source or "what i observed" in source or "explor" in source:
        return "exploratory"
    return "requirement"


def detect_input_quality(text: str) -> str:
    source = text.strip()
    lines = [line.strip() for line in source.splitlines() if line.strip()]
    lower = source.lower()

    signal_count = 0
    keywords = [
        "business goal",
        "user role",
        "main flow",
        "alternate flow",
        "validation",
        "error",
        "acceptance",
        "api",
        "backend",
        "expected",
        "actual result",
        "steps to reproduce",
        "known risks",
    ]
    for kw in keywords:
        if kw in lower:
            signal_count += 1

    if len(source) < 80 or len(lines) < 4:
        return "weak"
    if signal_count >= 5 and len(source) > 180:
        return "strong"
    return "usable"


def detect_generation_quality(test_cases: List[Dict[str, Any]], api_tests: List[Dict[str, Any]], fail_reasons: List[str]) -> str:
    if fail_reasons:
        return "generic" if len(test_cases) < 2 else "decent"
    if len(test_cases) >= 4 and len(api_tests) >= 1:
        return "strong"
    if len(test_cases) >= 2:
        return "decent"
    return "generic"


def fallback_analysis(req: AnalyzeRequest) -> Dict[str, Any]:
    detected_type = fallback_detect_type(req.input_text, req.selected_template)
    input_text = req.input_text.strip()
    quality = detect_input_quality(input_text)

    missing: List[str] = []
    if "acceptance" not in input_text.lower():
        missing.append("Acceptance criteria were not clearly provided.")
    if "error" not in input_text.lower():
        missing.append("Error behavior or failure scenarios are missing.")
    if "api" not in input_text.lower() and "endpoint" not in input_text.lower():
        missing.append("Backend/API behavior is not explicitly described.")
    if quality == "weak":
        missing.append("The requirement is too short to produce high-confidence QA coverage.")

    return {
        "detected_type": detected_type,
        "detected_domain": "general_product_workflow",
        "input_quality": quality,
        "key_entities": ["feature", "validation", "flow"],
        "coverage_possible": [
            "happy path",
            "validation tests",
            "negative scenarios",
            "basic regression coverage",
        ],
        "missing_information": missing,
        "suggestion_to_improve": "Add business goal, user role, main flow, alternate flow, validation rules, error cases, acceptance criteria, and backend behavior.",
        "assistant_message": f"I understood this as a {detected_type} input. Current input quality is {quality}. I can generate QA output, but stronger requirement detail will improve precision and completeness.",
    }


def fallback_improve_input(req: ImproveInputRequest) -> Dict[str, Any]:
    template = req.selected_template or "requirement"
    source = req.input_text.strip()

    if template == "bug":
        improved = f"""Bug Title:
{source[:80] or "Describe the bug"}

Environment:
Device / browser / app version:

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Severity:
Priority:

Logs / Screenshots:

Possible Root Cause:
"""
    elif template == "api":
        improved = f"""API Name:
{source[:80] or "Describe the API"}

Endpoint:
Method:

Request Headers:
Request Body:

Expected Status Code:
Expected Response Body:

Negative Cases:
- Invalid payload
- Missing required field
- Unauthorized request

Performance Expectations:
"""
    elif template == "exploratory":
        improved = f"""Session Title:
{source[:80] or "Describe the exploratory session"}

Scope:
What I tested:

What I observed:

Issues / Risks:

Ideas to explore next:

Attachments:
"""
    else:
        improved = f"""Feature Name:
{source[:80] or "Describe the feature"}

Business Goal:
User Role:

Main Flow:
1.
2.
3.

Alternate Flow:

Validation Rules:

Error Scenarios:

API / Backend Behavior:

Acceptance Criteria:

Known Risks:

Out of Scope:
"""

    return {
        "improved_input": improved,
        "improvement_notes": [
            "Added a structured QA template.",
            "Added placeholders for validation, error handling, and expected behavior.",
            "Expanded the prompt so AI can produce stronger and less generic output.",
        ],
        "input_quality_before": detect_input_quality(source),
        "input_quality_after": "strong",
        "assistant_message": "I rewrote your notes into a stronger QA-ready template. Fill the missing sections to improve coverage and review score.",
    }


def build_fallback_test_cases(analysis: Dict[str, Any], req: GenerateRequest) -> List[Dict[str, Any]]:
    title_prefix = req.capture_title or req.project_name or "Requirement"

    cases = [
        {
            "id": "TC-001",
            "title": f"Verify main flow works for {title_prefix}",
            "objective": "Validate the primary business flow behaves correctly.",
            "priority": "High",
            "preconditions": [
                "User has access to the feature.",
                "Required environment and valid test data are available.",
            ],
            "test_data": [
                "Valid input data",
                "Known good account/session",
            ],
            "steps": [
                "Open the feature.",
                "Enter the required valid data.",
                "Perform the main action and submit.",
            ],
            "expected_results": [
                "The main flow completes successfully.",
                "The user sees the expected system response without errors.",
            ],
            "automation_candidate": True,
            "tags": ["smoke", "functional", "ui"],
        },
        {
            "id": "TC-002",
            "title": f"Verify required-field validation for {title_prefix}",
            "objective": "Ensure missing mandatory data is handled correctly.",
            "priority": "High",
            "preconditions": [
                "Validation-enabled fields are present.",
            ],
            "test_data": [
                "Blank required fields",
            ],
            "steps": [
                "Open the feature.",
                "Leave required fields empty.",
                "Attempt to continue or submit.",
            ],
            "expected_results": [
                "Clear validation messages are displayed.",
                "Submission is blocked until valid data is entered.",
            ],
            "automation_candidate": True,
            "tags": ["validation", "negative", "ui"],
        },
        {
            "id": "TC-003",
            "title": f"Verify invalid input handling for {title_prefix}",
            "objective": "Validate invalid format or invalid business-rule data is rejected safely.",
            "priority": "Medium",
            "preconditions": [
                "The feature accepts typed or formatted input.",
            ],
            "test_data": [
                "Invalid format input",
                "Boundary-breaking values",
            ],
            "steps": [
                "Open the feature.",
                "Enter invalid or boundary-breaking input.",
                "Attempt to submit.",
            ],
            "expected_results": [
                "The system displays meaningful validation feedback.",
                "Invalid data is not accepted.",
            ],
            "automation_candidate": True,
            "tags": ["validation", "boundary", "negative"],
        },
        {
            "id": "TC-004",
            "title": f"Verify failure-path behavior for {title_prefix}",
            "objective": "Ensure backend or system errors are handled predictably.",
            "priority": "Medium",
            "preconditions": [
                "A backend/API dependency exists for the main operation.",
            ],
            "test_data": [
                "Simulated API/server failure",
            ],
            "steps": [
                "Open the feature.",
                "Trigger the main action while backend failure is simulated.",
            ],
            "expected_results": [
                "The system shows a user-friendly error message.",
                "The user is not left in an inconsistent state.",
            ],
            "automation_candidate": True,
            "tags": ["error-handling", "api", "resilience"],
        },
    ]
    return cases


def build_fallback_api_tests() -> List[Dict[str, Any]]:
    return [
        {
            "id": "API-001",
            "title": "Verify successful response for main API call",
            "endpoint": "/placeholder",
            "method": "POST",
            "scenario": "Valid request returns expected success response.",
            "request_data": ["Valid headers", "Valid payload"],
            "expected_status": "200/201",
            "expected_response_checks": [
                "Response body contains expected fields.",
                "No server-side error is returned.",
            ],
            "negative_checks": [
                "Invalid payload should return validation error.",
                "Unauthorized request should return auth error.",
            ],
            "automation_candidate": True,
        },
        {
            "id": "API-002",
            "title": "Verify invalid request is rejected",
            "endpoint": "/placeholder",
            "method": "POST",
            "scenario": "Invalid or incomplete payload returns proper failure response.",
            "request_data": ["Missing required body field"],
            "expected_status": "400/422",
            "expected_response_checks": [
                "Error response explains validation failure.",
            ],
            "negative_checks": [
                "Missing auth should fail cleanly.",
            ],
            "automation_candidate": True,
        },
    ]


def calculate_fail_reasons(output: Dict[str, Any], original_input: Optional[str]) -> List[str]:
    fail_reasons: List[str] = []

    test_cases = output.get("test_cases", []) or []
    api_tests = output.get("api_tests", []) or []
    missing_info = output.get("missing_information", []) or []

    if not original_input or len(original_input.strip()) < 80:
        fail_reasons.append("Input requirement is too short or vague.")
    if len(test_cases) < 2:
        fail_reasons.append("Too few meaningful test cases were generated.")
    if not any(tc.get("expected_results") for tc in test_cases):
        fail_reasons.append("Expected results are missing from generated test cases.")
    if not any("validation" in " ".join(tc.get("tags", [])).lower() for tc in test_cases):
        fail_reasons.append("Validation coverage is weak or missing.")
    if not api_tests and ("api" in (original_input or "").lower() or "backend" in (original_input or "").lower()):
        fail_reasons.append("API/backend-related coverage was expected but not generated.")
    if missing_info:
        fail_reasons.append("Important requirement details are still missing.")

    return fail_reasons


def build_fallback_output(analysis: Dict[str, Any], req: GenerateRequest) -> Dict[str, Any]:
    recommendation_prompt = (
        "Rewrite the requirement with business goal, user role, main flow, alternate flow, "
        "validation rules, error scenarios, acceptance criteria, and backend behavior."
    )

    test_cases = build_fallback_test_cases(analysis, req)
    api_tests = build_fallback_api_tests() if req.generate_scope in ["all", "api_tests"] else []
    if req.generate_scope == "test_cases":
        api_tests = []

    output = {
        "detected_type": analysis["detected_type"],
        "detected_domain": analysis["detected_domain"],
        "input_quality": analysis.get("input_quality", detect_input_quality(req.input_text)),
        "generation_quality": "decent",
        "conversational_summary": analysis["assistant_message"],
        "what_ai_understood": [
            f"Detected as {analysis['detected_type']}.",
            "This appears to be a product workflow needing functional, validation, and negative-path QA coverage.",
            "The current input supports usable baseline QA generation.",
        ],
        "missing_information": analysis["missing_information"],
        "recommendation_prompt": recommendation_prompt,
        "fail_reasons": [],
        "test_cases": test_cases if req.generate_scope != "api_tests" else [],
        "edge_cases": [
            "Verify behavior with empty required fields.",
            "Verify invalid format or boundary value input.",
            "Verify duplicate submission or retry behavior.",
            "Verify system behavior during API/server failure.",
            "Verify timeout/session refresh/state loss handling.",
        ] if req.generate_scope != "api_tests" else [],
        "api_tests": api_tests,
        "automation_ideas": [
            {
                "id": "AUTO-001",
                "title": "Automate main happy path",
                "why_it_matters": "This provides stable smoke and regression coverage.",
                "approach": "Automate with Playwright and data-driven assertions.",
                "priority": "High",
            },
            {
                "id": "AUTO-002",
                "title": "Automate validation and failure-path checks",
                "why_it_matters": "Validation and failure handling regressions are high risk.",
                "approach": "Use UI/API automation with invalid, boundary, and negative payload data.",
                "priority": "High",
            },
        ] if req.generate_scope != "review_only" else [],
        "qa_notes": [
            "Generated using fallback structured QA logic.",
            "Use Improve My Requirement to strengthen missing sections before regenerating.",
        ],
    }

    output["fail_reasons"] = calculate_fail_reasons(output, req.input_text)
    output["generation_quality"] = detect_generation_quality(
        output["test_cases"], output["api_tests"], output["fail_reasons"]
    )
    return output


def fallback_review(output: Dict[str, Any], original_input: Optional[str]) -> Dict[str, Any]:
    test_cases = output.get("test_cases", []) or []
    api_tests = output.get("api_tests", []) or []
    edge_cases = output.get("edge_cases", []) or []
    missing = output.get("missing_information", []) or []
    fail_reasons = calculate_fail_reasons(output, original_input)

    requirement_understanding = 18 if original_input and len(original_input.strip()) > 150 else 12
    functional_coverage = min(20, 6 + len(test_cases) * 3)
    edge_score = min(15, 4 + len(edge_cases) * 2)
    negative_cases = 12 if len(edge_cases) >= 3 else 7
    api_coverage = 10 if len(api_tests) >= 2 else 6 if len(api_tests) == 1 else 2
    clarity = 10 if all(tc.get("expected_results") for tc in test_cases) and test_cases else 5
    automation_ready = 10 if any(tc.get("automation_candidate") for tc in test_cases) else 4

    total = (
        requirement_understanding
        + functional_coverage
        + edge_score
        + negative_cases
        + api_coverage
        + clarity
        + automation_ready
    )

    if fail_reasons:
        total -= min(18, len(fail_reasons) * 4)

    total = normalize_score(total, 0, 100)

    strengths = [
        "Structured QA sections were generated instead of raw text.",
    ]
    if test_cases:
        strengths.append("Test cases include steps and expected results.")
    if api_tests:
        strengths.append("API-focused checks were included.")
    if edge_cases:
        strengths.append("Edge-case coverage was included.")

    weaknesses: List[str] = []
    if missing:
        weaknesses.append("Some key requirement details are still missing.")
    if len(api_tests) < 2:
        weaknesses.append("API coverage is limited or incomplete.")
    if len(test_cases) < 4:
        weaknesses.append("Functional scenario depth can be stronger.")
    weaknesses.extend(fail_reasons[:3])

    improve: List[str] = []
    improve.extend(missing[:4])
    if len(api_tests) < 2:
        improve.append("Add backend failure, authorization, invalid payload, and partial-data scenarios.")
    if len(test_cases) < 4:
        improve.append("Add more alternate flows, business-rule validations, and recovery scenarios.")
    if not original_input or len(original_input.strip()) < 150:
        improve.append("Provide richer requirement context before generation.")
    if not any("acceptance" in line.lower() for line in (original_input or "").splitlines()):
        improve.append("Add explicit acceptance criteria for stronger traceability.")

    if total >= 90:
        pass_status = "pass"
        quality_label = "strong"
    elif total >= 65:
        pass_status = "needs_review"
        quality_label = "decent"
    else:
        pass_status = "fail"
        quality_label = "generic"

    summary = (
        f"The QA pack scored {total}/100. "
        f"It is rated as {quality_label}. "
        f"{'It passes with strong coverage, but still has improvement opportunities.' if pass_status == 'pass' else 'It needs more detail and stronger failure-path coverage before it is fully reliable.' if pass_status == 'needs_review' else 'It fails because the requirement detail and generated coverage are too weak or incomplete.'}"
    )

    return {
        "total_score": total,
        "score_breakdown": {
            "requirement_understanding": requirement_understanding,
            "functional_coverage": functional_coverage,
            "edge_cases": edge_score,
            "negative_cases": negative_cases,
            "api_coverage": api_coverage,
            "clarity": clarity,
            "automation_ready": automation_ready,
        },
        "strengths": strengths,
        "weaknesses": weaknesses,
        "missing_items": missing,
        "how_to_improve": improve,
        "summary": summary,
        "pass_status": pass_status,
        "fail_reasons": fail_reasons,
        "quality_label": quality_label,
    }


def llm_json(prompt: str) -> Dict[str, Any]:
    client = get_openai_client()
    if client is None:
        raise RuntimeError("OpenAI client is not configured.")

    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior QA architect and QA lead. "
                    "Always return strict JSON only. "
                    "Do not wrap JSON in markdown fences."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    content = response.choices[0].message.content or "{}"
    return parse_json_response(content)


# -------------------------------------------------
# Prompts
# -------------------------------------------------


def build_analyze_prompt(req: AnalyzeRequest) -> str:
    return f"""
Analyze the following QA input as a senior QA analyst assistant.

Return strict JSON with this shape:
{{
  "detected_type": "requirement | bug | exploratory | api",
  "detected_domain": "string",
  "input_quality": "weak | usable | strong",
  "key_entities": ["string"],
  "coverage_possible": ["string"],
  "missing_information": ["string"],
  "suggestion_to_improve": "string",
  "assistant_message": "string"
}}

Project Name: {req.project_name or ""}
Capture Title: {req.capture_title or ""}
Selected Template: {req.selected_template or ""}

Input:
{req.input_text}
"""


def build_improve_prompt(req: ImproveInputRequest) -> str:
    return f"""
Rewrite the following QA input so it becomes much stronger and more structured for AI-driven QA generation.

Return strict JSON with this shape:
{{
  "improved_input": "string",
  "improvement_notes": ["string"],
  "input_quality_before": "weak | usable | strong",
  "input_quality_after": "weak | usable | strong",
  "assistant_message": "string"
}}

Rules:
- Preserve the user's intent.
- Add structure and placeholders where information is missing.
- Make it look like a strong QA requirement template.
- Do not invent product facts. Use placeholders when needed.

Selected Template: {req.selected_template or ""}
Project Name: {req.project_name or ""}
Capture Title: {req.capture_title or ""}

Original Input:
{req.input_text}
"""


def build_generate_prompt(req: GenerateRequest, analysis: Dict[str, Any]) -> str:
    files_hint = ", ".join(req.file_names) if req.file_names else "None"
    extra_context = "\n".join(req.attached_context) if req.attached_context else "None"

    scope_rules = {
        "all": "Generate complete output with test cases, edge cases, API tests, automation ideas, and notes.",
        "test_cases": "Generate only test-case focused output. API tests can be empty if not needed.",
        "api_tests": "Generate API-heavy coverage. Functional test cases can be minimal if needed.",
        "review_only": "Generate only enough structured output for review context.",
    }

    return f"""
You are a senior QA lead generating a production-quality QA pack.

Return strict JSON with this exact shape:
{{
  "detected_type": "string",
  "detected_domain": "string",
  "input_quality": "weak | usable | strong",
  "generation_quality": "generic | decent | strong",
  "conversational_summary": "string",
  "what_ai_understood": ["string"],
  "missing_information": ["string"],
  "recommendation_prompt": "string",
  "fail_reasons": ["string"],
  "test_cases": [
    {{
      "id": "TC-001",
      "title": "string",
      "objective": "string",
      "priority": "High | Medium | Low",
      "preconditions": ["string"],
      "test_data": ["string"],
      "steps": ["string"],
      "expected_results": ["string"],
      "automation_candidate": true,
      "tags": ["string"]
    }}
  ],
  "edge_cases": ["string"],
  "api_tests": [
    {{
      "id": "API-001",
      "title": "string",
      "endpoint": "string",
      "method": "GET | POST | PUT | PATCH | DELETE",
      "scenario": "string",
      "request_data": ["string"],
      "expected_status": "string",
      "expected_response_checks": ["string"],
      "negative_checks": ["string"],
      "automation_candidate": true
    }}
  ],
  "automation_ideas": [
    {{
      "id": "AUTO-001",
      "title": "string",
      "why_it_matters": "string",
      "approach": "string",
      "priority": "High | Medium | Low"
    }}
  ],
  "qa_notes": ["string"]
}}

Rules:
- Be specific, not generic.
- Use actual QA structure.
- Explain what was understood.
- Mention what is missing.
- Explain what would make the output fail or feel incomplete.
- Generate at least 4 strong test cases if scope allows.
- Generate meaningful edge cases.
- Include API tests if backend behavior is implied.
- Write like a real QA analyst, not like a generic assistant.
- Focus on testability, validation, negative scenarios, backend behavior, and automation readiness.

Scope Rule:
{scope_rules[req.generate_scope]}

Analysis:
{json.dumps(analysis, indent=2)}

Project Name: {req.project_name or ""}
Capture Title: {req.capture_title or ""}
Input Mode: {req.input_mode}
Selected Template: {req.selected_template or ""}
Attached Files: {files_hint}

Attached Context:
{extra_context}

User Input:
{req.input_text}
"""


def build_review_prompt(req: ReviewRequest) -> str:
    return f"""
You are reviewing an AI-generated QA pack as a senior QA manager.

Return strict JSON with this exact shape:
{{
  "total_score": 0,
  "score_breakdown": {{
    "requirement_understanding": 0,
    "functional_coverage": 0,
    "edge_cases": 0,
    "negative_cases": 0,
    "api_coverage": 0,
    "clarity": 0,
    "automation_ready": 0
  }},
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missing_items": ["string"],
  "how_to_improve": ["string"],
  "summary": "string",
  "pass_status": "pass | needs_review | fail",
  "fail_reasons": ["string"],
  "quality_label": "generic | decent | strong"
}}

Scoring limits:
- requirement_understanding: 0-20
- functional_coverage: 0-20
- edge_cases: 0-15
- negative_cases: 0-15
- api_coverage: 0-10
- clarity: 0-10
- automation_ready: 0-10

Rules:
- Explain exactly why the score is not 100.
- If the score is below 60, clearly explain why it fails.
- If score is high, still explain the remaining gaps.
- Add fail reasons when structure, validation, expected results, or backend coverage are weak.
- The summary must sound conversational and helpful.

Selected Template: {req.selected_template or ""}
Original Input:
{req.original_input or ""}

Generated Output:
{json.dumps(req.output, indent=2)}
"""


# -------------------------------------------------
# Routes
# -------------------------------------------------


@app.get("/")
async def root():
    return {"ok": True, "service": APP_TITLE}


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    try:
        client = get_openai_client()
        if client is None:
            return fallback_analysis(req)

        result = llm_json(build_analyze_prompt(req))
        return result
    except Exception:
        return fallback_analysis(req)


@app.post("/improve-input", response_model=ImproveInputResponse)
async def improve_input(req: ImproveInputRequest):
    try:
        client = get_openai_client()
        if client is None:
            return ImproveInputResponse(**fallback_improve_input(req))

        try:
            data = llm_json(build_improve_prompt(req))
            return ImproveInputResponse(**data)
        except Exception:
            return ImproveInputResponse(**fallback_improve_input(req))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    try:
        analyze_req = AnalyzeRequest(
            input=req.input_text,
            selected_template=req.selected_template,
            project_name=req.project_name,
            capture_title=req.capture_title,
        )

        analysis = fallback_analysis(analyze_req)
        client = get_openai_client()

        if client is not None:
            try:
                analysis = llm_json(build_analyze_prompt(analyze_req))
            except Exception:
                analysis = fallback_analysis(analyze_req)

        if client is None:
            output_data = build_fallback_output(analysis, req)
        else:
            try:
                output_data = llm_json(build_generate_prompt(req, analysis))
            except Exception:
                output_data = build_fallback_output(analysis, req)

        output_data["fail_reasons"] = calculate_fail_reasons(output_data, req.input_text)
        output_data["generation_quality"] = detect_generation_quality(
            output_data.get("test_cases", []),
            output_data.get("api_tests", []),
            output_data.get("fail_reasons", []),
        )

        output_model = GeneratedQaOutput(**output_data)

        review_model: Optional[ReviewOutput] = None
        if req.run_review:
            review_req = ReviewRequest(
                output=output_model.model_dump(),
                original_input=req.input_text,
                selected_template=req.selected_template,
            )

            if client is None:
                review_data = fallback_review(output_model.model_dump(), req.input_text)
            else:
                try:
                    review_data = llm_json(build_review_prompt(review_req))
                except Exception:
                    review_data = fallback_review(output_model.model_dump(), req.input_text)

            review_model = ReviewOutput(**review_data)

        return GenerateResponse(
            analysis=analysis,
            output=output_model,
            review=review_model,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/review", response_model=ReviewOutput)
async def review(req: ReviewRequest):
    try:
        client = get_openai_client()
        if client is None:
            return ReviewOutput(**fallback_review(req.output, req.original_input))

        try:
            review_data = llm_json(build_review_prompt(req))
            return ReviewOutput(**review_data)
        except Exception:
            return ReviewOutput(**fallback_review(req.output, req.original_input))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)