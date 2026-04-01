import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";
import KeyboardSafeWrapper from "../src/components/KeyboardSafeWrapper";
import {
  analyzeInput,
  generateSmartQa,
  reviewGeneratedOutput,
} from "../src/lib/api";
import type {
  QaAnalyzeResponse,
  QaGenerateResponse,
  QaGeneratedOutput,
  QaReview,
} from "../src/types/qa";

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

const exploratoryTemplate = `Session Title:
Scope:

Feature / Area Under Test:

What I tested:

What I observed:

Issues / Risks:

Unexpected behaviors:

Ideas to explore next:

Attachments / Evidence:
`;

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ExploratoryPage() {
  const params = useLocalSearchParams();

  const projectName = asString(params.projectName);
  const captureTitle = asString(params.captureTitle);

  const [notes, setNotes] = useState(exploratoryTemplate);
  const [analysis, setAnalysis] = useState<QaAnalyzeResponse | null>(null);
  const [generated, setGenerated] = useState<QaGeneratedOutput | null>(null);
  const [review, setReview] = useState<QaReview | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const handleAnalyze = async () => {
    Keyboard.dismiss();

    if (!notes.trim()) {
      Alert.alert("Missing Notes", "Please add exploratory notes first.");
      return;
    }

    try {
      setAnalyzing(true);
      const result = await analyzeInput({
        input: notes,
        selected_template: "exploratory",
        project_name: projectName,
        capture_title: captureTitle,
      });
      setAnalysis(result);
    } catch (error: any) {
      Alert.alert(
        "Analyze Error",
        error?.message || "Unable to analyze notes.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    Keyboard.dismiss();

    if (!notes.trim()) {
      Alert.alert("Missing Notes", "Please add exploratory notes first.");
      return;
    }

    try {
      setGenerating(true);

      const result: QaGenerateResponse = await generateSmartQa({
        input_text: notes,
        input_mode: "manual",
        selected_template: "exploratory",
        project_name: projectName,
        capture_title: captureTitle,
        file_names: [],
        attached_context: [],
        run_review: true,
        generate_scope: "all",
      });

      setAnalysis(result.analysis);
      setGenerated(result.output);
      setReview(result.review || null);
    } catch (error: any) {
      Alert.alert(
        "Generate Error",
        error?.message || "Unable to generate exploratory output.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleReviewAgain = async () => {
    Keyboard.dismiss();

    if (!generated) {
      Alert.alert("Nothing to Review", "Generate exploratory output first.");
      return;
    }

    try {
      setReviewing(true);
      const result = await reviewGeneratedOutput({
        output: generated as unknown as Record<string, unknown>,
        original_input: notes,
        selected_template: "exploratory",
      });
      setReview(result);
    } catch (error: any) {
      Alert.alert(
        "Review Error",
        error?.message || "Unable to review exploratory output.",
      );
    } finally {
      setReviewing(false);
    }
  };

  const handleReset = () => {
    Keyboard.dismiss();
    setNotes(exploratoryTemplate);
    setAnalysis(null);
    setGenerated(null);
    setReview(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Exploratory Studio"
        current="exploratory"
        fallbackRoute="/project-dashboard"
      />

      <KeyboardSafeWrapper>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>EXPLORATORY</Text>
            <Text style={styles.heroTitle}>
              Capture evidence, surface risks, suggest automation
            </Text>
            <Text style={styles.heroSubtitle}>
              Turn exploratory notes, screenshots, and supporting documents into
              structured QA observations, risks, and follow-up actions.
            </Text>
          </View>

          <SectionCard title="Exploratory Notes">
            <Text style={styles.sectionText}>
              Fill in what you tested, what you observed, and what still feels
              risky.
            </Text>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add exploratory notes"
              placeholderTextColor="#94a3b8"
              multiline
              style={styles.input}
            />

            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleAnalyze}
                disabled={analyzing || generating}
                activeOpacity={0.85}
              >
                {analyzing ? (
                  <ActivityIndicator color="#7c3aed" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Analyze</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleGenerate}
                disabled={generating || analyzing}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Generate Output</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonText}>Reset Notes</Text>
              </TouchableOpacity>
            </View>
          </SectionCard>

          {analysis ? (
            <SectionCard title="AI Understanding">
              <Text style={styles.assistantSummary}>
                {analysis.assistant_message}
              </Text>

              <Text style={styles.subSectionTitle}>Detected Type</Text>
              <Text style={styles.bulletText}>• {analysis.detected_type}</Text>

              <Text style={styles.subSectionTitle}>Coverage AI can derive</Text>
              {analysis.coverage_possible.map((item, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {item}
                </Text>
              ))}

              <Text style={styles.subSectionTitle}>Missing Information</Text>
              {analysis.missing_information.length ? (
                analysis.missing_information.map((item, index) => (
                  <Text key={index} style={styles.bulletText}>
                    • {item}
                  </Text>
                ))
              ) : (
                <Text style={styles.bulletText}>
                  • No major missing information detected.
                </Text>
              )}
            </SectionCard>
          ) : null}

          {generated ? (
            <>
              <SectionCard title="AI Summary">
                <Text style={styles.assistantSummary}>
                  {generated.conversational_summary}
                </Text>

                <Text style={styles.subSectionTitle}>What AI Understood</Text>
                {generated.what_ai_understood.map((item, index) => (
                  <Text key={index} style={styles.bulletText}>
                    • {item}
                  </Text>
                ))}

                <Text style={styles.subSectionTitle}>Missing Information</Text>
                {generated.missing_information.length ? (
                  generated.missing_information.map((item, index) => (
                    <Text key={index} style={styles.bulletText}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.bulletText}>
                    • No major missing detail detected.
                  </Text>
                )}

                <Text style={styles.subSectionTitle}>Fail Reasons</Text>
                {generated.fail_reasons.length ? (
                  generated.fail_reasons.map((item, index) => (
                    <Text key={index} style={styles.failText}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.bulletText}>
                    • No major fail reasons detected.
                  </Text>
                )}
              </SectionCard>

              {generated.test_cases.length ? (
                <SectionCard title="Exploratory-Derived Test Cases">
                  {generated.test_cases.map((tc) => (
                    <View key={tc.id} style={styles.outputBlock}>
                      <Text style={styles.outputTitle}>
                        {tc.id} — {tc.title}
                      </Text>
                      <Text style={styles.outputText}>
                        Objective: {tc.objective}
                      </Text>

                      <Text style={styles.outputLabel}>Steps</Text>
                      {tc.steps.map((item, idx) => (
                        <Text key={idx} style={styles.numberText}>
                          {idx + 1}. {item}
                        </Text>
                      ))}

                      <Text style={styles.outputLabel}>Expected Results</Text>
                      {tc.expected_results.map((item, idx) => (
                        <Text key={idx} style={styles.bulletText}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  ))}
                </SectionCard>
              ) : null}

              {generated.edge_cases.length ? (
                <SectionCard title="Exploratory Risks / Edge Cases">
                  {generated.edge_cases.map((item, index) => (
                    <Text key={index} style={styles.bulletText}>
                      • {item}
                    </Text>
                  ))}
                </SectionCard>
              ) : null}

              {generated.automation_ideas.length ? (
                <SectionCard title="Automation Ideas">
                  {generated.automation_ideas.map((idea) => (
                    <View key={idea.id} style={styles.outputBlock}>
                      <Text style={styles.outputTitle}>
                        {idea.id} — {idea.title}
                      </Text>
                      <Text style={styles.outputText}>
                        Why: {idea.why_it_matters}
                      </Text>
                      <Text style={styles.outputText}>
                        Approach: {idea.approach}
                      </Text>
                    </View>
                  ))}
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {review ? (
            <SectionCard title="Exploratory Review">
              <Text style={styles.reviewScore}>
                {review.total_score}/100 · {review.quality_label}
              </Text>
              <Text style={styles.assistantSummary}>{review.summary}</Text>

              <Text style={styles.subSectionTitle}>Why Not 100</Text>
              {review.how_to_improve.map((item, index) => (
                <Text key={index} style={styles.bulletText}>
                  • {item}
                </Text>
              ))}

              <Text style={styles.subSectionTitle}>Fail Reasons</Text>
              {review.fail_reasons.length ? (
                review.fail_reasons.map((item, index) => (
                  <Text key={index} style={styles.failText}>
                    • {item}
                  </Text>
                ))
              ) : (
                <Text style={styles.bulletText}>
                  • No critical fail reasons detected.
                </Text>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleReviewAgain}
                disabled={reviewing}
                activeOpacity={0.85}
              >
                {reviewing ? (
                  <ActivityIndicator color="#7c3aed" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Review Again</Text>
                )}
              </TouchableOpacity>
            </SectionCard>
          ) : null}
        </View>
      </KeyboardSafeWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  content: {
    paddingHorizontal: 24,
  },
  heroCard: {
    backgroundColor: "#5b2ca0",
    borderRadius: 28,
    padding: 24,
    marginBottom: 18,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#facc15",
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 40,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 28,
    color: "#ede9fe",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#64748b",
    marginBottom: 14,
  },
  input: {
    minHeight: 260,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  buttonColumn: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 54,
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 54,
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  secondaryButtonText: {
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: "800",
  },
  assistantSummary: {
    fontSize: 15,
    lineHeight: 26,
    color: "#334155",
    marginBottom: 12,
  },
  subSectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 25,
    color: "#334155",
    marginBottom: 4,
  },
  failText: {
    fontSize: 15,
    lineHeight: 25,
    color: "#dc2626",
    marginBottom: 4,
  },
  numberText: {
    fontSize: 15,
    lineHeight: 25,
    color: "#334155",
    marginBottom: 4,
  },
  outputBlock: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  outputTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  outputLabel: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
  },
  outputText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#334155",
  },
  reviewScore: {
    fontSize: 22,
    fontWeight: "900",
    color: "#7c3aed",
    marginBottom: 6,
  },
});
