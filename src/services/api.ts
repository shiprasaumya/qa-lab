const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

type GeneratePayload = {
  projectId: string;
  requirement: string;
};

type ScreenshotGeneratePayload = {
  projectId: string;
  requirement: string;
  screenshotBase64: string;
  screenshotMimeType?: string;
};

type RefinePayload = {
  projectId: string;
  requirement: string;
  currentOutput: string;
  mode: "improve" | "negative" | "automation";
  outputType?: string;
};

type GenerateResponse = {
  result: string;
};

type GenerateAllResponse = {
  testCases: string;
  edgeCases: string;
  apiTests: string;
  playwright: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retries = 2,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed: any = null;

      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = raw;
      }

      if (!response.ok) {
        const message =
          parsed?.detail ||
          parsed?.message ||
          (typeof parsed === "string" ? parsed : null) ||
          `Request failed with status ${response.status}`;
        throw new Error(message);
      }

      return parsed as T;
    } catch (error: any) {
      lastError = error;

      const isRetryable =
        error?.name === "AbortError" ||
        String(error?.message || "")
          .toLowerCase()
          .includes("network request failed") ||
        String(error?.message || "")
          .toLowerCase()
          .includes("fetch");

      if (!isRetryable || attempt === retries) {
        if (isRetryable) {
          throw new Error(
            `Cannot reach backend at ${API_BASE_URL}. Check backend, Wi-Fi, and firewall.`,
          );
        }
        throw error;
      }

      await sleep(800 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError as Error;
}

export const generateTestCases = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate-test-cases`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};

export const generateEdgeCases = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate-edge-cases`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};
export const generateApiTests = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate/api-tests`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};

export const generatePlaywrightScript = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate/playwright`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};

export const generateScreenshotSteps = async (
  requirement: string,
  imageUri: string,
) => {
  const res = await fetch(`${API_BASE_URL}/generate/screenshot`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};
export const generateAll = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate/all`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};
export const refineOutput = async (requirement: string) => {
  const res = await fetch(`${API_BASE_URL}/generate/refine`, {
    method: "POST",
    headers: { "Const-Type": "application/json" },
    body: JSON.stringify({ requirement }),
  });

  return res.json();
};
