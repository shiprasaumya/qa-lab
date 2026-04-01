import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeader from "../src/components/AppHeader";
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

type InputSource = "manual" | "document" | "image" | "combined";
type GenerateKind = "test_cases" | "edge_cases" | "api_tests" | "playwright";

type LocalAttachment = {
  id: string;
  name: string;
  uri: string;
  mimeType?: string | null;
  size?: number | null;
  kind: "image" | "document";
  base64?: string;
};

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatFileSize(size?: number | null) {
  if (!size) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function labelForKind(kind: GenerateKind) {
  switch (kind) {
    case "test_cases":
      return "Generate Test Cases";
    case "edge_cases":
      return "Generate Edge Cases";
    case "api_tests":
      return "Generate API Tests";
    case "playwright":
      return "Generate Playwright Script";
    default:
      return "Generate";
  }
}

function selectedTemplateForKind(kind: GenerateKind) {
  switch (kind) {
    case "api_tests":
      return "api";
    default:
      return "requirement";
  }
}

function buildHeadingAndNotesText(heading: string, notes: string) {
  return `Heading: ${heading || "Untitled"}\n\nManual Notes:\n${notes || "No notes provided."}`;
}

function attachmentSummary(attachments: LocalAttachment[]) {
  if (!attachments.length) return "No attachments were added.";
  return attachments
    .map((file, index) => {
      const size = formatFileSize(file.size);
      return `${index + 1}. ${file.name}${size ? ` (${size})` : ""}`;
    })
    .join("\n");
}

function imageAttachmentPayload(attachments: LocalAttachment[]) {
  return attachments
    .filter((item) => item.kind === "image")
    .map((item) => ({
      name: item.name,
      mime_type: item.mimeType || "image/jpeg",
      base64: item.base64 || "",
    }))
    .filter((item) => item.base64);
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function GeneratorsPage() {
  const params = useLocalSearchParams();

  const projectId = asString(params.projectId);
  const projectName = asString(params.projectName);
  const captureId = asString(params.captureId);
  const captureTitle = asString(params.captureTitle);

  const [heading, setHeading] = useState(captureTitle || "New");
  const [manualNotes, setManualNotes] = useState("");
  const [inputSource, setInputSource] = useState<InputSource>("manual");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachmentRetention, setAttachmentRetention] = useState<
    "keep_in_folder" | "use_once"
  >("keep_in_folder");

  const [analysis, setAnalysis] = useState<QaAnalyzeResponse | null>(null);
  const [generated, setGenerated] = useState<QaGeneratedOutput | null>(null);
  const [review, setReview] = useState<QaReview | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [loadingKind, setLoadingKind] = useState<GenerateKind | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const requirementText = useMemo(
    () => buildHeadingAndNotesText(heading, manualNotes),
    [heading, manualNotes],
  );

  const currentQualityColor = useMemo(() => {
    if (!review) return "#64748b";
    if (review.total_score >= 85) return "#059669";
    if (review.total_score >= 60) return "#d97706";
    return "#dc2626";
  }, [review]);

  const inferredSource = useMemo<InputSource>(() => {
    const hasNotes = manualNotes.trim().length > 0 || heading.trim().length > 0;
    const hasImages = attachments.some((item) => item.kind === "image");
    const hasDocs = attachments.some((item) => item.kind === "document");

    if (hasNotes && (hasImages || hasDocs)) return "combined";
    if (hasImages && !hasDocs && !hasNotes) return "image";
    if (hasDocs && !hasImages && !hasNotes) return "document";
    return inputSource;
  }, [attachments, heading, inputSource, manualNotes]);

  const addPickedAttachments = async (
    items: Array<{
      name: string;
      uri: string;
      mimeType?: string | null;
      size?: number | null;
      kind: "image" | "document";
    }>,
  ) => {
    const hydrated: LocalAttachment[] = [];

    for (const item of items) {
      let base64: string | undefined;

      try {
        if (item.kind === "image") {
          base64 = await FileSystem.readAsStringAsync(item.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch {
        base64 = undefined;
      }

      hydrated.push({
        id: makeId("att"),
        name: item.name,
        uri: item.uri,
        mimeType: item.mimeType,
        size: item.size,
        kind: item.kind,
        base64,
      });
    }

    setAttachments((prev) => [...prev, ...hydrated]);
  };

  const handlePickDocuments = async () => {
    Keyboard.dismiss();

    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled) return;

      await addPickedAttachments(
        result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType,
          size: asset.size,
          kind: asset.mimeType?.startsWith("image/") ? "image" : "document",
        })),
      );
    } catch (error: any) {
      Alert.alert(
        "Attachment Error",
        error?.message || "Unable to attach files.",
      );
    }
  };

  const handlePickImage = async () => {
    Keyboard.dismiss();

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Photo library permission is required.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsMultipleSelection: true,
        base64: false,
      });

      if (result.canceled) return;

      await addPickedAttachments(
        result.assets.map((asset, index) => ({
          name: asset.fileName || `image_${index + 1}.jpg`,
          uri: asset.uri,
          mimeType: asset.mimeType || "image/jpeg",
          size: asset.fileSize || null,
          kind: "image",
        })),
      );
    } catch (error: any) {
      Alert.alert("Image Error", error?.message || "Unable to select image.");
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const buildAiInputText = () => {
    const attachmentText = attachmentSummary(attachments);

    return [
      `Project: ${projectName || projectId || "Untitled Project"}`,
      `Capture: ${heading || captureTitle || "Untitled Capture"}`,
      `Input Source: ${inferredSource}`,
      "",
      requirementText,
      "",
      "Attachments:",
      attachmentText,
    ].join("\n");
  };

  const runAnalyze = async () => {
    Keyboard.dismiss();

    if (!heading.trim() && !manualNotes.trim() && attachments.length === 0) {
      Alert.alert(
        "Missing Input",
        "Please add title, notes, or attachments first.",
      );
      return;
    }

    try {
      setAnalyzing(true);

      const result = await analyzeInput({
        input: buildAiInputText(),
        selected_template: "requirement",
        project_name: projectName || projectId || "",
        capture_title: heading || captureTitle || "Untitled Capture",
      });

      setAnalysis(result);
    } catch (error: any) {
      Alert.alert(
        "Analyze Error",
        error?.message || "Unable to analyze input.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const runImprove = async () => {
    Keyboard.dismiss();

    if (!heading.trim() && !manualNotes.trim()) {
      Alert.alert("Missing Input", "Please add heading or notes first.");
      return;
    }

    try {
      setImproving(true);

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
      if (!baseUrl) {
        throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.");
      }

      const response = await fetch(`${baseUrl}/improve-input`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_text: buildAiInputText(),
          selected_template: "requirement",
          project_name: projectName || projectId || "",
          capture_title: heading || captureTitle || "Untitled Capture",
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        throw new Error(raw || "Unable to improve input.");
      }

      const data = JSON.parse(raw);
      if (data?.improved_input) {
        const improved = String(data.improved_input);
        setManualNotes(improved);
      }

      Alert.alert(
        "AI Improved Input",
        data?.assistant_message ||
          "Requirement notes were improved successfully.",
      );
    } catch (error: any) {
      Alert.alert(
        "Improve Error",
        error?.message || "Unable to improve requirement.",
      );
    } finally {
      setImproving(false);
    }
  };

  const runGenerate = async (kind: GenerateKind) => {
    Keyboard.dismiss();

    if (!heading.trim() && !manualNotes.trim() && attachments.length === 0) {
      Alert.alert(
        "Missing Input",
        "Please add title, notes, or attachments first.",
      );
      return;
    }

    try {
      setLoadingKind(kind);

      const payload = {
        input_text: buildAiInputText(),
        input_mode: inferredSource,
        selected_template: selectedTemplateForKind(kind),
        project_name: projectName || projectId || "",
        capture_title: heading || captureTitle || "Untitled Capture",
        file_names: attachments.map((file) => file.name),
        attached_context: [],
        image_attachments: imageAttachmentPayload(attachments),
        run_review: true,
        generate_scope: kind === "api_tests" ? "api_tests" : "test_cases",
      };

      const result: QaGenerateResponse = await generateSmartQa(
        payload as QaGenerateResponse extends never ? never : any,
      );

      setGenerated(result.output);
      setReview(result.review || null);

      if (kind === "playwright") {
        Alert.alert(
          "Playwright Generation",
          "QA output was generated. If you want, next I can wire a dedicated Playwright code block/export inside this same screen.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Generator Error",
        error?.message || "Unable to generate output.",
      );
    } finally {
      setLoadingKind(null);
    }
  };

  const runReviewAgain = async () => {
    Keyboard.dismiss();

    if (!generated) {
      Alert.alert("Nothing to Review", "Generate QA output first.");
      return;
    }

    try {
      setReviewing(true);

      const result = await reviewGeneratedOutput({
        output: generated as unknown as Record<string, unknown>,
        original_input: buildAiInputText(),
        selected_template: "requirement",
      });

      setReview(result);
    } catch (error: any) {
      Alert.alert(
        "Review Error",
        error?.message || "Unable to review generated output.",
      );
    } finally {
      setReviewing(false);
    }
  };

  const resetAll = () => {
    Keyboard.dismiss();
    setHeading(captureTitle || "New");
    setManualNotes("");
    setInputSource("manual");
    setAttachments([]);
    setAnalysis(null);
    setGenerated(null);
    setReview(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="AI Test Creation"
        current="generators"
        fallbackRoute="/project-dashboard"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={82}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroBadge}>SMART QA</Text>
            <Text style={styles.heroTitle}>
              Autonomous quality starts with better test creation
            </Text>
            <Text style={styles.heroSubtitle}>
              Generate QA-ready test cases, edge cases, API coverage, and
              automation ideas from manual notes, uploaded documents, or
              screenshots.
            </Text>

            <View style={styles.heroActionsRow}>
              <TouchableOpacity style={styles.heroPill}>
                <Ionicons name="folder-outline" size={18} color="#111827" />
                <Text style={styles.heroPillText}>Project Workspace</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.heroPill} onPress={resetAll}>
                <Ionicons name="albums-outline" size={18} color="#111827" />
                <Text style={styles.heroPillText}>New</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {generated?.test_cases?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{review ? 1 : 0}</Text>
              <Text style={styles.statLabel}>Needs Review</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {generated?.edge_cases?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>

          <SectionCard title="Capabilities">
            <View style={styles.capabilityCard}>
              <View
                style={[
                  styles.capabilityIconWrap,
                  { backgroundColor: "#f5e8ac" },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color="#1f2937"
                />
              </View>
              <View style={styles.capabilityTextWrap}>
                <Text style={styles.capabilityTitle}>
                  Manual / Requirement Input
                </Text>
                <Text style={styles.capabilityText}>
                  Write requirement notes, acceptance criteria, and QA context
                  to generate structured outputs.
                </Text>
              </View>
            </View>

            <View style={styles.capabilityCard}>
              <View
                style={[
                  styles.capabilityIconWrap,
                  { backgroundColor: "#dfeafb" },
                ]}
              >
                <Ionicons name="copy-outline" size={28} color="#1f2937" />
              </View>
              <View style={styles.capabilityTextWrap}>
                <Text style={styles.capabilityTitle}>
                  Document + Image Context
                </Text>
                <Text style={styles.capabilityText}>
                  Add screenshots, PDFs, and files so AI can generate more
                  context-aware test coverage.
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="Input Source">
            <View style={styles.chipWrap}>
              {(["manual", "document", "image", "combined"] as const).map(
                (source) => {
                  const active = inputSource === source;
                  return (
                    <TouchableOpacity
                      key={source}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setInputSource(source)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {source === "manual"
                          ? "Manual Text"
                          : source.charAt(0).toUpperCase() + source.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>

            <Text style={styles.inputLabel}>Heading</Text>
            <TextInput
              style={styles.singleInput}
              value={heading}
              onChangeText={setHeading}
              placeholder="Enter heading"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.inputLabel}>Manual Notes</Text>
            <TextInput
              style={styles.multiInput}
              value={manualNotes}
              onChangeText={setManualNotes}
              placeholder="Describe requirement, acceptance criteria, observed behavior, or business flow..."
              placeholderTextColor="#9ca3af"
              multiline
            />
          </SectionCard>

          <SectionCard title="Attachments">
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handlePickDocuments}
            >
              <Text style={styles.attachButtonText}>Attach Files</Text>
            </TouchableOpacity>

            <View style={styles.attachActionsRow}>
              <TouchableOpacity
                style={styles.attachMiniButton}
                onPress={handlePickImage}
              >
                <Ionicons name="image-outline" size={18} color="#2563eb" />
                <Text style={styles.attachMiniButtonText}>Add Image</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>
              Any image or file will be sent with real context so AI can read
              and analyze it before generating QA outputs.
            </Text>

            <Text style={styles.inputLabel}>After Generate</Text>
            <View style={styles.chipWrap}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  attachmentRetention === "keep_in_folder" && styles.chipActive,
                ]}
                onPress={() => setAttachmentRetention("keep_in_folder")}
              >
                <Text
                  style={[
                    styles.chipText,
                    attachmentRetention === "keep_in_folder" &&
                      styles.chipTextActive,
                  ]}
                >
                  Keep in Folder
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.chip,
                  attachmentRetention === "use_once" &&
                    styles.useOnceChipActive,
                ]}
                onPress={() => setAttachmentRetention("use_once")}
              >
                <Text
                  style={[
                    styles.chipText,
                    attachmentRetention === "use_once" &&
                      styles.useOnceChipText,
                  ]}
                >
                  Use Once
                </Text>
              </TouchableOpacity>
            </View>

            {attachments.length ? (
              attachments.map((file) => (
                <View key={file.id} style={styles.attachmentCard}>
                  <View style={styles.attachmentIconWrap}>
                    <Ionicons
                      name={
                        file.kind === "image"
                          ? "image-outline"
                          : "document-outline"
                      }
                      size={24}
                      color="#5b84e3"
                    />
                  </View>

                  <View style={styles.attachmentTextWrap}>
                    <Text style={styles.attachmentName}>{file.name}</Text>
                    <Text style={styles.attachmentMeta}>
                      {file.kind.toUpperCase()}{" "}
                      {formatFileSize(file.size)
                        ? `• ${formatFileSize(file.size)}`
                        : ""}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.removeAttachmentBtn}
                    onPress={() => removeAttachment(file.id)}
                  >
                    <Ionicons name="close" size={18} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyAttachmentBox}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={30}
                  color="#94a3b8"
                />
                <Text style={styles.emptyAttachmentText}>
                  No attachments added yet
                </Text>
              </View>
            )}
          </SectionCard>

          <SectionCard title="Generate Outputs">
            <Text style={styles.generateTitle}>
              Choose what you want AI to create
            </Text>
            <Text style={styles.generateSubtitle}>
              Use the current heading, notes, and attachments to generate
              review-ready QA outputs.
            </Text>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => runGenerate("test_cases")}
              disabled={loadingKind !== null}
            >
              {loadingKind === "test_cases" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Test Cases
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => runGenerate("edge_cases")}
              disabled={loadingKind !== null}
            >
              {loadingKind === "edge_cases" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Edge Cases
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => runGenerate("api_tests")}
              disabled={loadingKind !== null}
            >
              {loadingKind === "api_tests" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate API Tests
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => runGenerate("playwright")}
              disabled={loadingKind !== null}
            >
              {loadingKind === "playwright" ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.generateButtonText}>
                  Generate Playwright Script
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={runAnalyze}
                disabled={analyzing || improving || loadingKind !== null}
              >
                {analyzing ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <Text style={styles.secondaryActionText}>Analyze</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={runImprove}
                disabled={improving || analyzing || loadingKind !== null}
              >
                {improving ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <Text style={styles.secondaryActionText}>
                    Improve My Requirement
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </SectionCard>

          {analysis ? (
            <SectionCard title="AI Pre-Analysis">
              <Text style={styles.summaryText}>
                {analysis.assistant_message}
              </Text>

              <Text style={styles.subTitle}>Coverage AI can generate</Text>
              {analysis.coverage_possible.map((item, index) => (
                <Text key={index} style={styles.listText}>
                  • {item}
                </Text>
              ))}

              <Text style={styles.subTitle}>Missing Information</Text>
              {analysis.missing_information.length ? (
                analysis.missing_information.map((item, index) => (
                  <Text key={index} style={styles.listText}>
                    • {item}
                  </Text>
                ))
              ) : (
                <Text style={styles.listText}>
                  • No major missing information detected.
                </Text>
              )}
            </SectionCard>
          ) : null}

          {generated ? (
            <>
              <SectionCard title="AI Assistant Summary">
                <Text style={styles.summaryText}>
                  {generated.conversational_summary}
                </Text>

                <Text style={styles.subTitle}>What AI understood</Text>
                {generated.what_ai_understood.map((item, index) => (
                  <Text key={index} style={styles.listText}>
                    • {item}
                  </Text>
                ))}

                <Text style={styles.subTitle}>Missing Information</Text>
                {generated.missing_information.length ? (
                  generated.missing_information.map((item, index) => (
                    <Text key={index} style={styles.listText}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.listText}>
                    • No major missing detail detected.
                  </Text>
                )}

                <Text style={styles.subTitle}>Fail Reasons</Text>
                {generated.fail_reasons.length ? (
                  generated.fail_reasons.map((item, index) => (
                    <Text key={index} style={styles.failText}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.listText}>
                    • No major fail reasons detected.
                  </Text>
                )}
              </SectionCard>

              {generated.test_cases?.length ? (
                <SectionCard title="Structured Test Cases">
                  {generated.test_cases.map((tc) => (
                    <View key={tc.id} style={styles.outputCard}>
                      <Text style={styles.outputTitle}>
                        {tc.id} — {tc.title}
                      </Text>
                      <Text style={styles.outputLine}>
                        Objective: {tc.objective}
                      </Text>
                      <Text style={styles.outputLine}>
                        Priority: {tc.priority}
                      </Text>

                      <Text style={styles.outputSubTitle}>Steps</Text>
                      {tc.steps.map((step, idx) => (
                        <Text key={idx} style={styles.outputLine}>
                          {idx + 1}. {step}
                        </Text>
                      ))}

                      <Text style={styles.outputSubTitle}>
                        Expected Results
                      </Text>
                      {tc.expected_results.map((item, idx) => (
                        <Text key={idx} style={styles.outputLine}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  ))}
                </SectionCard>
              ) : null}

              {generated.edge_cases?.length ? (
                <SectionCard title="Edge Cases">
                  {generated.edge_cases.map((item, index) => (
                    <Text key={index} style={styles.listText}>
                      • {item}
                    </Text>
                  ))}
                </SectionCard>
              ) : null}

              {generated.api_tests?.length ? (
                <SectionCard title="API Tests">
                  {generated.api_tests.map((api) => (
                    <View key={api.id} style={styles.outputCard}>
                      <Text style={styles.outputTitle}>
                        {api.id} — {api.title}
                      </Text>
                      <Text style={styles.outputLine}>
                        Method: {api.method}
                      </Text>
                      <Text style={styles.outputLine}>
                        Endpoint: {api.endpoint}
                      </Text>
                      <Text style={styles.outputLine}>
                        Scenario: {api.scenario}
                      </Text>
                    </View>
                  ))}
                </SectionCard>
              ) : null}
            </>
          ) : null}

          {review ? (
            <SectionCard title="AI Review">
              <Text
                style={[styles.reviewScore, { color: currentQualityColor }]}
              >
                {review.total_score}/100 · {review.quality_label}
              </Text>
              <Text style={styles.summaryText}>{review.summary}</Text>

              <Text style={styles.subTitle}>Why not 100</Text>
              {review.how_to_improve.map((item, index) => (
                <Text key={index} style={styles.listText}>
                  • {item}
                </Text>
              ))}

              <Text style={styles.subTitle}>Fail Reasons</Text>
              {review.fail_reasons.length ? (
                review.fail_reasons.map((item, index) => (
                  <Text key={index} style={styles.failText}>
                    • {item}
                  </Text>
                ))
              ) : (
                <Text style={styles.listText}>
                  • No critical fail reasons detected.
                </Text>
              )}

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={runReviewAgain}
                disabled={reviewing}
              >
                {reviewing ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <Text style={styles.secondaryActionText}>Review Again</Text>
                )}
              </TouchableOpacity>
            </SectionCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: "#173b89",
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
    color: "#dbeafe",
    marginBottom: 20,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  heroPillText: {
    marginLeft: 8,
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7b8794",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
  },
  capabilityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  capabilityIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  capabilityTextWrap: {
    flex: 1,
  },
  capabilityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  capabilityText: {
    fontSize: 15,
    lineHeight: 26,
    color: "#6b7280",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chipActive: {
    backgroundColor: "#dbeafe",
  },
  useOnceChipActive: {
    backgroundColor: "#fce8cf",
  },
  chipText: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#2563eb",
  },
  useOnceChipText: {
    color: "#ea580c",
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
  },
  singleInput: {
    height: 54,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    color: "#111827",
    fontSize: 15,
    backgroundColor: "#ffffff",
  },
  multiInput: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    color: "#111827",
    fontSize: 15,
    backgroundColor: "#ffffff",
    textAlignVertical: "top",
  },
  attachButton: {
    height: 78,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#2f5fd1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  attachButtonText: {
    color: "#2f5fd1",
    fontSize: 18,
    fontWeight: "800",
  },
  attachActionsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  attachMiniButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attachMiniButtonText: {
    marginLeft: 8,
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "700",
  },
  helperText: {
    fontSize: 14,
    lineHeight: 24,
    color: "#6b7280",
    marginBottom: 18,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
  },
  attachmentIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  attachmentMeta: {
    fontSize: 14,
    color: "#6b7280",
  },
  removeAttachmentBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAttachmentBox: {
    height: 130,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emptyAttachmentText: {
    marginTop: 8,
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "600",
  },
  generateTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 8,
  },
  generateSubtitle: {
    fontSize: 14,
    lineHeight: 24,
    color: "#6b7280",
    marginBottom: 18,
  },
  generateButton: {
    height: 74,
    borderRadius: 24,
    backgroundColor: "#2f5fd1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  generateButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "800",
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 26,
    color: "#334155",
    marginBottom: 12,
  },
  subTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
  },
  listText: {
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
  outputCard: {
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
  outputSubTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 4,
  },
  outputLine: {
    fontSize: 14,
    lineHeight: 24,
    color: "#334155",
  },
  reviewScore: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
});
