import { QAResponse } from "../types/qa";

export const parseResult = (raw: any): QAResponse => {
  if (!raw) {
    return {
      testCases: [],
      edgeCases: [],
      risks: [],
      exploratory: [],
      review: {
        score: 0,
        issues: [],
        suggestions: [],
      },
    };
  }

  // Already structured
  if (raw.testCases) {
    return raw as QAResponse;
  }

  // Fallback for text-based or unknown format
  return {
    testCases: [],
    edgeCases: [],
    risks: [],
    exploratory: [],
    review: {
      score: 50,
      issues: ["Unstructured response received"],
      suggestions: ["Ensure backend returns structured QAResponse"],
    },
  };
};
