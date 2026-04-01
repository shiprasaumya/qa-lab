import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function sanitizeFileName(value: string) {
  return (value || "file")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function ensureContent(value: string, fallback: string) {
  const trimmed = (value || "").trim();
  return trimmed || fallback;
}

export async function copyTextOutput(label: string, value: string) {
  await Clipboard.setStringAsync(value || "");
  return `${label} copied`;
}

export async function exportPlaywrightSpec(params: {
  projectName: string;
  captureTitle: string;
  content: string;
}) {
  const { projectName, captureTitle, content } = params;

  const safeProject = sanitizeFileName(projectName || "project");
  const safeCapture = sanitizeFileName(captureTitle || "capture");
  const fileName = `${safeProject}_${safeCapture}.spec.ts`;

  const directory =
    FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  if (!directory) {
    throw new Error("No local directory available for export.");
  }

  const fileUri = `${directory}${fileName}`;

  await FileSystem.writeAsStringAsync(
    fileUri,
    ensureContent(
      content,
      `import { test, expect } from '@playwright/test';

test('placeholder test', async ({ page }) => {
await page.goto('https://example.com');
await expect(page).toBeTruthy();
});
`,
    ),
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/plain",
      dialogTitle: "Share Playwright Spec",
      UTI: "public.plain-text",
    });
  }

  return fileUri;
}

export async function exportFullQaPack(params: {
  projectName: string;
  captureTitle: string;
  requirement: string;
  testCases: string;
  edgeCases: string;
  apiTests: string;
  playwright: string;
  screenshotOutput: string;
  coveragePercent: number;
  missingCoverage: string[];
  bugRiskScore: number;
  bugRiskLevel: string;
  bugRiskReasons: string[];
}) {
  const {
    projectName,
    captureTitle,
    requirement,
    testCases,
    edgeCases,
    apiTests,
    playwright,
    screenshotOutput,
    coveragePercent,
    missingCoverage,
    bugRiskScore,
    bugRiskLevel,
    bugRiskReasons,
  } = params;

  const safeProject = sanitizeFileName(projectName || "project");
  const safeCapture = sanitizeFileName(captureTitle || "capture");
  const fileName = `${safeProject}_${safeCapture}_qa_pack.txt`;

  const directory =
    FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  if (!directory) {
    throw new Error("No local directory available for export.");
  }

  const fileUri = `${directory}${fileName}`;

  const fullPack = `
TESTMIND AI - FULL QA PACK
=========================

Project:
${projectName || "N/A"}

Capture:
${captureTitle || "N/A"}

Generated On:
${new Date().toLocaleString()}

--------------------------------------------------
REQUIREMENT
--------------------------------------------------
${ensureContent(requirement, "No requirement provided.")}

--------------------------------------------------
QUALITY SUMMARY
--------------------------------------------------
Coverage Percent: ${coveragePercent}%
Bug Risk Score: ${bugRiskScore}/100
Bug Risk Level: ${bugRiskLevel}
Missing Coverage: ${missingCoverage.length ? missingCoverage.join(", ") : "None"}

Risk Reasons:
${bugRiskReasons.length ? bugRiskReasons.map((r, i) => `${i + 1}. ${r}`).join("\n") : "No major risk indicators detected."}

--------------------------------------------------
TEST CASES
--------------------------------------------------
${ensureContent(testCases, "No test cases generated.")}

--------------------------------------------------
EDGE CASES
--------------------------------------------------
${ensureContent(edgeCases, "No edge cases generated.")}

--------------------------------------------------
API SCENARIOS
--------------------------------------------------
${ensureContent(apiTests, "No API scenarios generated.")}

--------------------------------------------------
PLAYWRIGHT SCRIPT
--------------------------------------------------
${ensureContent(playwright, "No Playwright script generated.")}

--------------------------------------------------
VISUAL QA OUTPUT
--------------------------------------------------
${ensureContent(screenshotOutput, "No visual QA output generated.")}
`.trim();

  await FileSystem.writeAsStringAsync(fileUri, fullPack, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "text/plain",
      dialogTitle: "Share Full QA Pack",
      UTI: "public.plain-text",
    });
  }

  return fileUri;
}
