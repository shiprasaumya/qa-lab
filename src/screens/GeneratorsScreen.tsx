import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import AppHeaderMenu from "../components/AppHeaderMenu";
import AttachmentPickerSheet, {
  PickedAttachment,
} from "../components/AttachmentPickerSheet";
import {
  generateEdgeCases,
  generatePlaywrightScript,
  generateScreenshotSteps,
  generateTestCases,
  showApiError,
} from "../services/api";

type Props = {
  route: any;
  navigation: any;
};

type OutputType =
  | "testCases"
  | "edgeCases"
  | "screenshot"
  | "playwright"
  | null;

export default function GeneratorsScreen({ route, navigation }: Props) {
  const { project, capture } = route.params || {};
  const [requirement, setRequirement] = useState("");
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loadingType, setLoadingType] = useState<OutputType>(null);
  const [result, setResult] = useState("");

  const addAttachment = (file: PickedAttachment) => {
    setAttachments((prev) => [...prev, file]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPrompt = () => {
    if (!attachments.length) return requirement.trim();

    const attachmentLines = attachments.map(
      (file, index) =>
        `${index + 1}. ${file.name} (${file.mimeType || "unknown type"})`,
    );

    return `${requirement.trim()}

Attached files:
${attachmentLines.join("\n")}`;
  };

  const validateBeforeGenerate = () => {
    if (!requirement.trim() && attachments.length === 0) {
      Alert.alert(
        "Validation",
        "Please enter requirement text or attach at least one file.",
      );
      return false;
    }
    return true;
  };

  const runGenerator = async (type: OutputType) => {
    if (!validateBeforeGenerate() || !project?.id) return;

    const promptText = buildPrompt();
    setLoadingType(type);

    try {
      if (type === "testCases") {
        const response = await generateTestCases({
          projectId: project.id,
          requirement: promptText,
        });
        setResult(response.result || "");
      }

      if (type === "edgeCases") {
        const response = await generateEdgeCases({
          projectId: project.id,
          requirement: promptText,
        });
        setResult(response.result || "");
      }

      if (type === "screenshot") {
        const response = await generateScreenshotSteps({
          projectId: project.id,
          requirement: promptText,
        });
        setResult(response.result || "");
      }

      if (type === "playwright") {
        const response = await generatePlaywrightScript({
          projectId: project.id,
          requirement: promptText,
        });
        setResult(response.result || "");
      }
    } catch (error) {
      showApiError(error);
    } finally {
      setLoadingType(null);
    }
  };

  const attachmentIcon = (file: PickedAttachment) => {
    if ((file.mimeType || "").startsWith("image/")) return "image-outline";
    if ((file.mimeType || "").includes("pdf")) return "document-text-outline";
    if ((file.mimeType || "").includes("word")) return "document-outline";
    if ((file.mimeType || "").includes("sheet")) return "grid-outline";
    return "attach-outline";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Generators"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.projectName}>{project?.name || "Project"}</Text>
          {!!capture?.title && (
            <Text style={styles.captureName}>Capture: {capture.title}</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Requirement</Text>
          <Text style={styles.sectionSubtext}>
            Type requirement text or attach files from gallery, camera, phone
            storage, iCloud, Google Drive, or other file providers.
            [oai_citation:2‡Expo
            Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/?utm_source=chatgpt.com)
          </Text>

          <View style={styles.requirementBox}>
            <TextInput
              value={requirement}
              onChangeText={setRequirement}
              placeholder="Paste requirement here..."
              placeholderTextColor="#9ca3af"
              multiline
              style={styles.input}
            />

            <View style={styles.attachRow}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setSheetVisible(true)}
              >
                <Ionicons name="add" size={22} color="#ffffff" />
              </TouchableOpacity>

              <Text style={styles.attachHint}>
                Attach files for this requirement
              </Text>
            </View>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentsWrap}>
              <Text style={styles.attachmentHeader}>Attached</Text>

              {attachments.map((file, index) => (
                <View
                  key={`${file.uri}_${index}`}
                  style={styles.attachmentChip}
                >
                  <View style={styles.attachmentLeft}>
                    <Ionicons
                      name={attachmentIcon(file) as any}
                      size={18}
                      color="#2563eb"
                    />
                    <View style={styles.attachmentTextWrap}>
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.attachmentMeta} numberOfLines={1}>
                        {file.mimeType || "Unknown type"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => removeAttachment(index)}>
                    <Ionicons name="close-circle" size={22} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Generate</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => runGenerator("testCases")}
            disabled={loadingType !== null}
          >
            {loadingType === "testCases" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate Test Cases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => runGenerator("edgeCases")}
            disabled={loadingType !== null}
          >
            {loadingType === "edgeCases" ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Generate Edge Cases
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => runGenerator("screenshot")}
            disabled={loadingType !== null}
          >
            {loadingType === "screenshot" ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Generate Screenshot Steps
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => runGenerator("playwright")}
            disabled={loadingType !== null}
          >
            {loadingType === "playwright" ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Generate Playwright Script
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Output</Text>
          <Text style={styles.outputText}>
            {result || "Generated result will appear here."}
          </Text>
        </View>
      </ScrollView>

      <AttachmentPickerSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPick={addAttachment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  captureName: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sectionSubtext: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
    marginBottom: 14,
  },
  requirementBox: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
  },
  input: {
    minHeight: 140,
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
  },
  attachRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  attachHint: {
    marginLeft: 10,
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "600",
  },
  attachmentsWrap: {
    marginTop: 14,
  },
  attachmentHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  attachmentChip: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachmentLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  attachmentTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  attachmentMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700",
  },
  outputText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
  },
});
