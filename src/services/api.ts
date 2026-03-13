import { Alert, Platform } from "react-native";

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:8000";
    }

    return "http://YOUR_LAPTOP_IP:8000";
  }

  return "http://YOUR_LAPTOP_IP:8000";
};

export const API_BASE_URL = getBaseUrl();

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = 90000, headers, ...rest } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      const message =
        typeof data === "object" && data && "detail" in data
          ? String((data as any).detail)
          : typeof data === "string"
            ? data
            : `Request failed with status ${response.status}`;

      throw new Error(message);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    if (
      String(error?.message || "").includes("Network request failed") ||
      String(error?.message || "").includes("fetch")
    ) {
      throw new Error(
        `Cannot reach backend at ${API_BASE_URL}. Make sure FastAPI is running and your phone and laptop are on the same Wi-Fi.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function healthCheck() {
  return apiRequest<{ status: string }>("/health", {
    method: "GET",
    timeoutMs: 10000,
  });
}

export async function generateTestCases(payload: {
  projectId: string;
  requirement: string;
}) {
  return apiRequest<{ result: string }>("/generate/test-cases", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 90000,
  });
}

export async function generateEdgeCases(payload: {
  projectId: string;
  requirement: string;
}) {
  return apiRequest<{ result: string }>("/generate/edge-cases", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 90000,
  });
}

export async function generateScreenshotSteps(payload: {
  projectId: string;
  requirement: string;
}) {
  return apiRequest<{ result: string }>("/generate/screenshot", {
    method: "POST",
    body: JSON.stringify(payload),
    timeoutMs: 120000,
  });
}

export async function generatePlaywrightScript(payload: {
  projectId: string;
  requirement: string;
}) {
  return apiRequest<{ result: string; fileName?: string }>(
    "/generate/playwright",
    {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 90000,
    },
  );
}

export function showApiError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  Alert.alert("Error", message);
}
