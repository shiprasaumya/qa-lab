from typing import Optional, Dict, List
import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()

client = None
if OPENAI_API_KEY and OpenAI:
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
    except Exception:
        client = None


class GeneratePayload(BaseModel):
    projectId: Optional[str] = None
    requirement: str


class ScreenshotGeneratePayload(BaseModel):
    projectId: Optional[str] = None
    requirement: str
    screenshotBase64: str
    screenshotMimeType: Optional[str] = "image/jpeg"


class RefinePayload(BaseModel):
    projectId: Optional[str] = None
    requirement: str
    currentOutput: str
    mode: str # improve | negative | automation
    outputType: Optional[str] = "test_cases"


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "openai_enabled": bool(client),
    }


def analyze_requirement_context(requirement: str) -> Dict[str, object]:
    text = (requirement or "").lower()

    signals: List[str] = []
    feature_type = "general"

    if any(word in text for word in ["login", "log in", "signin", "sign in", "auth", "password", "otp"]):
        signals.append("authentication")
        feature_type = "authentication"

    if any(word in text for word in ["payment", "transaction", "checkout", "billing", "refund"]):
        signals.append("payment")
        feature_type = "payment"

    if any(word in text for word in ["upload", "file", "attachment", "document", "pdf", "image"]):
        signals.append("file-handling")
    if feature_type == "general":
        feature_type = "file-handling"

    if any(word in text for word in ["api", "endpoint", "request", "response", "service", "integration"]):
        signals.append("api")
    if feature_type == "general":
        feature_type = "api"

    if any(word in text for word in ["admin", "role", "permission", "access", "authorization"]):
        signals.append("role-based")
    if feature_type == "general":
        feature_type = "role-based"

    if any(word in text for word in ["dashboard", "screen", "ui", "button", "form", "page", "layout"]):
        signals.append("ui")
    if feature_type == "general":
        feature_type = "ui"

    risk_level = "medium"
    if "payment" in signals or "authentication" in signals or "role-based" in signals:
        risk_level = "high"
    elif len(signals) <= 1:
        risk_level = "low"

    return {
        "feature_type": feature_type,
        "signals": signals,
        "risk_level": risk_level,
    }


def build_context_block(requirement: str) -> str:
    context = analyze_requirement_context(requirement)
    signals = ", ".join(context["signals"]) if context["signals"] else "general"
    return (
        f"Requirement Context:\n"
        f"- Feature Type: {context['feature_type']}\n"
        f"- Risk Level: {context['risk_level']}\n"
        f"- Signals: {signals}\n"
)   


def normalize_numbered_items(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    cleaned: List[str] = []
    item_no = 1

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if re.match(r"^\d+[\).\-\s]+", stripped):
            stripped = re.sub(r"^\d+[\).\-\s]+", "", stripped).strip()
            cleaned.append(f"{item_no}. {stripped}")
            item_no += 1
        else:
            cleaned.append(stripped)

    return "\n".join(cleaned).strip()


def _fallback_test_cases(requirement: str) -> str:
    return normalize_numbered_items(
        f"""
1. Verify valid user flow completes successfully for the feature.
2. Verify required fields or required inputs are validated correctly.
3. Verify invalid input is rejected with correct error handling.
4. Verify system state is saved and displayed correctly after submit or save action.
5. Verify user sees expected success message or next-step behavior.
6. Verify regression impact on related feature paths.

Requirement:
{requirement}
"""
)


def _fallback_edge_cases(requirement: str) -> str:
    return normalize_numbered_items(
        f"""
1. Verify blank or null input handling.
2. Verify maximum boundary values.
3. Verify minimum boundary values.
4. Verify special character handling.
5. Verify duplicate action or duplicate submission handling.
6. Verify timeout or slow network handling.
7. Verify session expiration behavior.
8. Verify unauthorized or restricted-access behavior where applicable.

Requirement:
{requirement}
"""
)


def _fallback_api_tests(requirement: str) -> str:
    return normalize_numbered_items(
        f"""
1. Verify valid request returns expected success status and schema.
2. Verify invalid payload returns validation error.
3. Verify missing required fields return proper error response.
4. Verify unauthorized request handling.
5. Verify duplicate request handling.
6. Verify boundary values and data types in request and response.
7. Verify integration failure or downstream error handling.
8. Verify response content matches business expectation.

Requirement:
{requirement}
"""
)


def _fallback_playwright(requirement: str) -> str:
    safe_comment = requirement.replace("*/", "* /")
    return f"""import {{ test, expect }} from '@playwright/test';

test('generated test for requirement', async ({{ page }}) => {{
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    await expect(page).toBeTruthy();
}});

/*
Requirement:
{safe_comment}
*/
"""


def _fallback_screenshot(requirement: str) -> str:
    return normalize_numbered_items(
        f"""
1. Verify screen title, labels, and CTA buttons are visible.
2. Verify spacing, alignment, and section layout are correct.
3. Verify visual hierarchy and primary action emphasis.
4. Verify field states, messages, and action placement.
5. Verify screenshot matches expected requirement flow.
6. Verify no obvious UI inconsistency or broken state is visible.

Requirement:
{requirement}
"""
)


def _fallback_refine(current_output: str, mode: str) -> str:
    base = normalize_numbered_items(current_output or "")
    if not base:
        return "1. Refined output could not be generated."

    if mode == "negative":
        return normalize_numbered_items(
            f"""
1. Verify invalid input handling for the refined flow.
2. Verify missing required data is rejected correctly.
3. Verify unauthorized or restricted access is blocked.
4. Verify duplicate or repeated action handling.
5. Verify timeout or downstream failure handling.

Current Output:
{base}
"""
        )

    if mode == "automation":
        return normalize_numbered_items(
            f"""
1. Prioritize stable selectors and deterministic assertions.
2. Cover the primary happy-path flow with reusable setup.
3. Add validation for error states and boundary checks.
4. Keep scenarios modular for automation maintainability.
5. Ensure assertions verify visible result and backend effect where applicable.

Current Output:
{base}
"""
        )

    return normalize_numbered_items(base)


def _call_openai_text(system_prompt: str, user_prompt: str, fallback_output: str) -> str:
    if not client:
        return fallback_output

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content if response.choices else None
        return content.strip() if content else fallback_output
    except Exception:
        return fallback_output


def _call_openai_vision(
system_prompt: str,
requirement: str,
screenshot_base64: str,
screenshot_mime_type: str,
fallback_output: str,
) -> str:
    if not client:
        return fallback_output

    data_url = f"data:{screenshot_mime_type};base64,{screenshot_base64}"

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{build_context_block(requirement)}\nRequirement:\n{requirement}\n\nAnalyze the attached screenshot and generate visual QA checks."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        },
                    ],
                },
            ],
            temperature=0.2,
        )
        content = response.choices[0].message.content if response.choices else None
        return content.strip() if content else fallback_output
    except Exception:
        return fallback_output


def build_test_case_prompt(requirement: str) -> str:
    return f"""
{build_context_block(requirement)}

Requirement:
{requirement}

Generate structured manual test scenarios.
Rules:
- Return plain text only.
- Return 6 to 10 numbered items.
- Each line should be one strong QA scenario title only.
- Focus on business-critical and user-visible behavior.
- Include authentication, permission, file, API, or state validations if context suggests them.
- Avoid explanations before or after the numbered list.
""".strip()


def build_edge_case_prompt(requirement: str) -> str:
    return f"""
{build_context_block(requirement)}

Requirement:
{requirement}

Generate edge cases and negative scenarios.
Rules:
- Return plain text only.
- Return 6 to 10 numbered items.
- Each line should be one strong edge or negative scenario title only.
- Prioritize validation failures, permissions, timeouts, duplicates, boundaries, and invalid data.
- Avoid explanations before or after the numbered list.
""".strip()


def build_api_prompt(requirement: str) -> str:
    return f"""
{build_context_block(requirement)}

Requirement:
{requirement}

Generate API test scenarios.
Rules:
- Return plain text only.
- Return 6 to 10 numbered items.
- Each line should be one API scenario title only.
- Focus on request validation, auth, schema, integration, status codes, data integrity, and error handling.
- Even if the requirement is UI-heavy, infer likely API validations where useful.
- Avoid explanations before or after the numbered list.
""".strip()


def build_playwright_prompt(requirement: str) -> str:
    return f"""
{build_context_block(requirement)}

Requirement:
{requirement}

Generate one Playwright TypeScript test file.
Rules:
- Return code only.
- Use @playwright/test style.
- Include a realistic test name.
- Include meaningful assertions where possible.
- Keep it generic if selectors are unknown.
- Do not wrap the answer in markdown fences.
""".strip()


def build_visual_prompt(requirement: str) -> str:
    return f"""
You are a QA visual testing expert.

{build_context_block(requirement)}

Requirement:
{requirement}

Generate visual QA checks.
Rules:
- Return plain text only.
- Return 6 to 10 numbered items.
- Focus on layout, alignment, content visibility, CTA prominence, state indication, and likely UI defects.
- Avoid explanations before or after the numbered list.
""".strip()


def build_refine_prompt(requirement: str, current_output: str, mode: str, output_type: str) -> str:
    mode_instructions = {
        "improve": "Improve clarity, remove weak items, and make the output more complete and professional.",
        "negative": "Add missing negative scenarios, failure paths, validation cases, and permission-related gaps.",
        "automation": "Refine the output so it is more automation-ready, stable, and suitable for Playwright or API automation."
    }.get(mode, "Improve the existing output.")

    return f"""
{build_context_block(requirement)}

Requirement:
{requirement}

Output Type:
{output_type}

Current Output:
{current_output}

Task:
{mode_instructions}

Rules:
- Return plain text only.
- Return a numbered list.
- Keep it concise and stronger than the original.
- Do not explain what changed.
- Do not include markdown fences.
""".strip()


@router.post("/generate/test-cases")
async def generate_test_cases(payload: GeneratePayload):
    requirement = payload.requirement.strip()

    result = _call_openai_text(
        "You are a senior QA engineer who writes high-quality, risk-aware test scenarios.",
        build_test_case_prompt(requirement),
        _fallback_test_cases(requirement),
    )
    return {"result": normalize_numbered_items(result)}


@router.post("/generate/edge-cases")
async def generate_edge_cases(payload: GeneratePayload):
    requirement = payload.requirement.strip()

    result = _call_openai_text(
        "You are a senior QA engineer specializing in negative testing and edge-case design.",
        build_edge_case_prompt(requirement),
        _fallback_edge_cases(requirement),
    )
    return {"result": normalize_numbered_items(result)}


@router.post("/generate/api-tests")
async def generate_api_tests(payload: GeneratePayload):
    requirement = payload.requirement.strip()

    result = _call_openai_text(
        "You are a senior QA engineer specializing in API and integration validation.",
        build_api_prompt(requirement),
        _fallback_api_tests(requirement),
    )
    return {"result": normalize_numbered_items(result)}


@router.post("/generate/playwright")
async def generate_playwright(payload: GeneratePayload):
    requirement = payload.requirement.strip()

    result = _call_openai_text(
        "You are a senior SDET who writes clean Playwright TypeScript tests.",
        build_playwright_prompt(requirement),
        _fallback_playwright(requirement),
    )
    return {"result": result.strip()}


@router.post("/generate/screenshot")
async def generate_screenshot(payload: ScreenshotGeneratePayload):
    requirement = payload.requirement.strip()
    screenshot_base64 = (payload.screenshotBase64 or "").strip()
    screenshot_mime_type = (payload.screenshotMimeType or "image/jpeg").strip()

    if not screenshot_base64:
        raise HTTPException(status_code=400, detail="Screenshot is not attached.")

    result = _call_openai_vision(
        build_visual_prompt(requirement),
        requirement,
        screenshot_base64,
        screenshot_mime_type,
        _fallback_screenshot(requirement),
    )
    return {"result": normalize_numbered_items(result)}


@router.post("/generate/refine")
async def generate_refine(payload: RefinePayload):
    requirement = payload.requirement.strip()
    current_output = payload.currentOutput.strip()
    mode = (payload.mode or "improve").strip().lower()
    output_type = (payload.outputType or "test_cases").strip().lower()

    if not current_output:
        raise HTTPException(status_code=400, detail="Current output is required for refinement.")

    result = _call_openai_text(
        "You are a senior QA engineer refining existing outputs into stronger, more useful deliverables.",
        build_refine_prompt(requirement, current_output, mode, output_type),
        _fallback_refine(current_output, mode),
    )
    return {"result": normalize_numbered_items(result) if output_type != "playwright" else result.strip()}


@router.post("/generate/all")
async def generate_all(payload: GeneratePayload):
    requirement = payload.requirement.strip()

    test_cases = _call_openai_text(
        "You are a senior QA engineer who writes high-quality, risk-aware test scenarios.",
        build_test_case_prompt(requirement),
        _fallback_test_cases(requirement),
    )

    edge_cases = _call_openai_text(
        "You are a senior QA engineer specializing in negative testing and edge-case design.",
        build_edge_case_prompt(requirement),
        _fallback_edge_cases(requirement),
    )

    api_tests = _call_openai_text(
        "You are a senior QA engineer specializing in API and integration validation.",
        build_api_prompt(requirement),
        _fallback_api_tests(requirement),
    )

    playwright = _call_openai_text(
        "You are a senior SDET who writes clean Playwright TypeScript tests.",
        build_playwright_prompt(requirement),
        _fallback_playwright(requirement),
    )

    return {
        "testCases": normalize_numbered_items(test_cases),
        "edgeCases": normalize_numbered_items(edge_cases),
        "apiTests": normalize_numbered_items(api_tests),
        "playwright": playwright.strip(),
    }