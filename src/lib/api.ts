import type {
  QaAnalyzeResponse,
  QaGenerateRequest,
  QaGenerateResponse,
  QaReview,
} from "../types/qa";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

function assertApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  assertApiBaseUrl();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(raw || `Request failed with ${response.status}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Server returned invalid JSON.");
  }
}

export async function analyzeInput(payload: {
  input: string;
  selected_template?: string;
  project_name?: string;
  capture_title?: string;
}): Promise<QaAnalyzeResponse> {
  return requestJson<QaAnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateSmartQa(
  payload: QaGenerateRequest,
): Promise<QaGenerateResponse> {
  return requestJson<QaGenerateResponse>("/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function reviewGeneratedOutput(payload: {
  output: Record<string, unknown>;
  original_input?: string;
  selected_template?: string;
}): Promise<QaReview> {
  return requestJson<QaReview>("/review", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
