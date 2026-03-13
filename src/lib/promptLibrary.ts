export type PromptMode = "functional" | "edge" | "automation";

export type PromptTemplate = {
  id: string;
  label: string;
  text: string;
};

export const PROMPT_LIBRARY: PromptTemplate[] = [
  {
    id: "banking",
    label: "Banking QA",
    text: "Focus on banking validations, transaction accuracy, account security, error handling, failed transfers, and sensitive data protection.",
  },
  {
    id: "ecommerce",
    label: "Ecommerce",
    text: "Focus on cart behavior, pricing accuracy, coupon logic, checkout validation, payment flow, order confirmation, and failure scenarios.",
  },
  {
    id: "security",
    label: "Security",
    text: "Focus on authentication, authorization, invalid access, session handling, input validation, abuse scenarios, and data protection.",
  },
  {
    id: "automation",
    label: "Automation Ready",
    text: "Generate concise, structured, automation-friendly steps with clear validations, assertion points, and stable action flow.",
  },
  {
    id: "accessibility",
    label: "Accessibility",
    text: "Include accessibility checks such as clear labels, readable text, focus behavior, keyboard interaction expectations, and understandable error messaging.",
  },
];
