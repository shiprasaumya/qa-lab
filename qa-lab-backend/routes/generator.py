import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

load_dotenv()

router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def ensure_openai_key():
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set in backend .env")


@router.get("/health")
async def health():
    return {
"status": "ok",
"openai_configured": bool(OPENAI_API_KEY),
"model": OPENAI_MODEL,
}


@router.post("/generate/test-cases")
async def generate_test_cases(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {"result": f"Generated test cases for: {requirement}"}


@router.post("/generate/edge-cases")
async def generate_edge_cases(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {"result": f"Generated edge cases for: {requirement}"}


@router.post("/generate/api-tests")
async def generate_api_tests(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {"result": f"Generated API tests for: {requirement}"}


@router.post("/generate/screenshot")
async def generate_screenshot(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {"result": f"Generated screenshot validation steps for: {requirement}"}


@router.post("/generate/playwright")
async def generate_playwright(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {
"result": f"Generated Playwright script for: {requirement}",
"fileName": "test.spec.ts",
}


@router.post("/generate/full-suite")
async def generate_full_suite(payload: dict):
    ensure_openai_key()
    requirement = payload.get("requirement", "")
    return {"result": f"Full QA suite generated for: {requirement}"}
