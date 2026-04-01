export type BugRiskLevel = "Low" | "Medium" | "High";

export type BugRiskResult = {
  score: number;
  level: BugRiskLevel;
  reasons: string[];
};

export type CoverageChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type StructuredTestItem = {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expectedResult: string;
  priority: "High" | "Medium" | "Low";
  riskTag: "High Risk" | "Medium Risk" | "Low Risk";
  category: "Functional" | "Negative" | "Edge" | "API" | "UI";
};

export function calculateBugRisk(input: {
  requirement: string;
  testCases?: string;
  edgeCases?: string;
  apiTests?: string;
  playwright?: string;
}) {
  const requirement = (input.requirement || "").toLowerCase();
  const testCases = (input.testCases || "").toLowerCase();
  const edgeCases = (input.edgeCases || "").toLowerCase();
  const apiTests = (input.apiTests || "").toLowerCase();
  const playwright = (input.playwright || "").toLowerCase();

  let score = 0;
  const reasons: string[] = [];

  if (!input.requirement.trim()) {
    score += 30;
    reasons.push("Requirement is missing or incomplete.");
  }

  if (requirement.includes("payment") || requirement.includes("transaction")) {
    score += 20;
    reasons.push("Payment or transaction flow detected.");
  }

  if (
    requirement.includes("login") ||
    requirement.includes("auth") ||
    requirement.includes("password") ||
    requirement.includes("otp")
  ) {
    score += 15;
    reasons.push("Authentication-related workflow detected.");
  }

  if (
    requirement.includes("api") ||
    requirement.includes("integration") ||
    requirement.includes("sync")
  ) {
    score += 15;
    reasons.push("Integration or API dependency detected.");
  }

  if (
    requirement.includes("upload") ||
    requirement.includes("attachment") ||
    requirement.includes("file")
  ) {
    score += 10;
    reasons.push("File handling flow detected.");
  }

  if (
    requirement.includes("role") ||
    requirement.includes("permission") ||
    requirement.includes("admin")
  ) {
    score += 10;
    reasons.push("Permission or role-based behavior detected.");
  }

  if (!testCases.trim()) {
    score += 10;
    reasons.push("Functional coverage is not generated yet.");
  }

  if (!edgeCases.trim()) {
    score += 10;
    reasons.push("Edge-case coverage is not generated yet.");
  }

  if (!apiTests.trim() && requirement.includes("api")) {
    score += 10;
    reasons.push("API coverage is missing for an API-related requirement.");
  }

  if (!playwright.trim()) {
    score += 5;
    reasons.push("Automation script coverage is not generated yet.");
  }

  if (score > 100) score = 100;

  let level: BugRiskLevel = "Low";
  if (score >= 70) level = "High";
  else if (score >= 40) level = "Medium";

  return {
    score,
    level,
    reasons,
  } as BugRiskResult;
}

export function buildCoverageChecklist(input: {
  requirement: string;
  testCases?: string;
  edgeCases?: string;
  apiTests?: string;
  playwright?: string;
  screenshotOutput?: string;
}) {
  const requirement = (input.requirement || "").toLowerCase();
  const testCases = !!input.testCases?.trim();
  const edgeCases = !!input.edgeCases?.trim();
  const apiTests = !!input.apiTests?.trim();
  const playwright = !!input.playwright?.trim();
  const screenshotOutput = !!input.screenshotOutput?.trim();

  const checklist: CoverageChecklistItem[] = [
    {
      id: "functional",
      label: "Functional happy-path coverage",
      checked: testCases,
    },
    {
      id: "negative",
      label: "Negative and edge-case coverage",
      checked: edgeCases,
    },
    {
      id: "automation",
      label: "Automation script coverage",
      checked: playwright,
    },
    {
      id: "ui",
      label: "UI / visual validation coverage",
      checked: screenshotOutput,
    },
  ];

  if (
    requirement.includes("api") ||
    requirement.includes("endpoint") ||
    requirement.includes("integration") ||
    requirement.includes("service")
  ) {
    checklist.push({
      id: "api",
      label: "API validation coverage",
      checked: apiTests,
    });
  }

  if (
    requirement.includes("login") ||
    requirement.includes("auth") ||
    requirement.includes("password") ||
    requirement.includes("otp")
  ) {
    checklist.push({
      id: "auth",
      label: "Authentication / authorization coverage",
      checked: testCases || edgeCases,
    });
  }

  if (
    requirement.includes("upload") ||
    requirement.includes("attachment") ||
    requirement.includes("file")
  ) {
    checklist.push({
      id: "file",
      label: "File handling coverage",
      checked: edgeCases || screenshotOutput,
    });
  }

  if (
    requirement.includes("role") ||
    requirement.includes("permission") ||
    requirement.includes("admin")
  ) {
    checklist.push({
      id: "role",
      label: "Role / permission coverage",
      checked: edgeCases || testCases,
    });
  }

  if (
    requirement.includes("payment") ||
    requirement.includes("transaction") ||
    requirement.includes("checkout")
  ) {
    checklist.push({
      id: "payment",
      label: "Payment / transaction coverage",
      checked: testCases && edgeCases,
    });
  }

  return checklist;
}

export function parseStructuredTestCases(
  text: string,
  mode: "test_cases" | "edge_cases" | "api_tests" = "test_cases",
) {
  if (!text?.trim()) return [];

  const blocks = text
    .split(/\n(?=\d+[\).\s-])/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const firstLine = lines[0] || `Scenario ${index + 1}`;
    const cleanedTitle = firstLine.replace(/^\d+[\).\s-]*/, "").trim();

    const body = lines.slice(1).join(" ");
    const category = detectCategory(`${cleanedTitle} ${body}`, mode);
    const priority = detectPriority(`${cleanedTitle} ${body}`);
    const riskTag = mapPriorityToRisk(priority);

    return {
      id: `${mode}-${index + 1}`,
      title: cleanedTitle,
      precondition: detectPrecondition(cleanedTitle, body, mode),
      steps: detectSteps(cleanedTitle, body, mode),
      expectedResult: detectExpectedResult(cleanedTitle, body, mode),
      priority,
      riskTag,
      category,
    } as StructuredTestItem;
  });
}

function detectCategory(
  text: string,
  mode: "test_cases" | "edge_cases" | "api_tests",
): StructuredTestItem["category"] {
  const value = text.toLowerCase();

  if (mode === "api_tests") return "API";
  if (mode === "edge_cases") return "Edge";

  if (
    value.includes("invalid") ||
    value.includes("error") ||
    value.includes("unauthorized") ||
    value.includes("missing")
  ) {
    return "Negative";
  }

  if (
    value.includes("button") ||
    value.includes("screen") ||
    value.includes("layout") ||
    value.includes("ui")
  ) {
    return "UI";
  }

  return "Functional";
}

function detectPriority(text: string): "High" | "Medium" | "Low" {
  const value = text.toLowerCase();

  if (
    value.includes("payment") ||
    value.includes("transaction") ||
    value.includes("login") ||
    value.includes("auth") ||
    value.includes("security") ||
    value.includes("permission") ||
    value.includes("critical")
  ) {
    return "High";
  }

  if (
    value.includes("upload") ||
    value.includes("api") ||
    value.includes("integration") ||
    value.includes("validation") ||
    value.includes("duplicate")
  ) {
    return "Medium";
  }

  return "Low";
}

function mapPriorityToRisk(
  priority: "High" | "Medium" | "Low",
): "High Risk" | "Medium Risk" | "Low Risk" {
  if (priority === "High") return "High Risk";
  if (priority === "Medium") return "Medium Risk";
  return "Low Risk";
}

function detectPrecondition(
  title: string,
  body: string,
  mode: "test_cases" | "edge_cases" | "api_tests",
) {
  const source = `${title} ${body}`.toLowerCase();

  if (mode === "api_tests")
    return "API is available and request payload is prepared.";
  if (source.includes("login") || source.includes("auth"))
    return "User is on the login flow.";
  if (source.includes("upload") || source.includes("file"))
    return "User is on the upload screen with file access.";
  if (source.includes("payment") || source.includes("transaction"))
    return "User is in a valid payment-ready state.";
  return "User is on the relevant feature screen.";
}

function detectSteps(
  title: string,
  body: string,
  mode: "test_cases" | "edge_cases" | "api_tests",
) {
  if (mode === "api_tests") {
    return [
      "Prepare request headers and payload.",
      "Send API request to the target endpoint.",
      "Validate response status, schema, and returned data.",
    ];
  }

  return [
    `Open the relevant feature for: ${title}.`,
    "Perform the required user action or data input.",
    "Validate system behavior and response.",
  ];
}

function detectExpectedResult(
  title: string,
  body: string,
  mode: "test_cases" | "edge_cases" | "api_tests",
) {
  const source = `${title} ${body}`.toLowerCase();

  if (source.includes("invalid") || source.includes("error")) {
    return "System should reject invalid input and show the correct validation or error response.";
  }

  if (source.includes("unauthorized") || source.includes("permission")) {
    return "System should block access and return the correct authorization behavior.";
  }

  if (mode === "api_tests") {
    return "API should return the expected status, response schema, and business data.";
  }

  return "System should complete the flow successfully and display the expected result.";
}
