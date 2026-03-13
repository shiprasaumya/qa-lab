import { BACKEND_URL } from "./backend";

export async function generateFromRequirementAI(payload: {
  capture_title: string;
  requirement_text: string;
  prompt_mode: string;
  custom_prompt?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/generate-from-requirement`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to generate from requirement");
  }

  return res.json() as Promise<{ content: string }>;
}

export async function generateFromScreenshotAI(payload: {
  capture_title: string;
  image_url: string;
  requirement_text?: string;
  prompt_mode?: string;
  custom_prompt?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/generate-from-screenshot`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to generate from screenshot");
  }

  return res.json() as Promise<{ content: string }>;
}

export async function generateFromFileAI(payload: {
  capture_title: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  prompt_mode?: string;
  custom_prompt?: string;
}) {
  const res = await fetch(`${BACKEND_URL}/generate-from-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Failed to generate from file");
  }

  return res.json() as Promise<{ content: string }>;
}
