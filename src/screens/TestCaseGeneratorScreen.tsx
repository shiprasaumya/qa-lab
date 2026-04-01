import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AppHeaderMenu from "../components/AppHeaderMenu";
import {
    generateEdgeCases,
    generatePlaywrightScript,
    //generateScreenshotSteps,
    generateTestCases,
} from "../services/api";

type Props = {
  route: any;
  navigation: any;
};

type AttachmentItem = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size?: number | null;
  source: "camera" | "photos" | "files" | "screenshot";
};

type OutputStatus = "pending" | "approved" | "needs_review";

type ScenarioItem = {
  id: string;
  title: string;
  content: string;
  type: "testcases" | "edgecases" | "apitests" | "playwright" | "screenshot";
  status: OutputStatus;
};

function getAttachmentIcon(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();

  if (mimeType.startsWith("image/")) return "image-outline";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return "document-text-outline";
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return "document-outline";
  }
  if (
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".csv")
  ) {
    return "grid-outline";
  }
  if (
    lower.endsWith(".json") ||
    lower.endsWith(".xml") ||
    lower.endsWith(".txt")
  ) {
    return "code-outline";
  }
  return "attach-outline";
}

function getErrorMessage(error: any) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.detail === "string") return error.detail;
  if (typeof error?.error === "string") return error.error;
  if (typeof error?.response?.data?.detail === "string") {
    return error.response.data.detail;
  }
  if (typeof error?.response?.data?.message === "string") {
    return error.response.data.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unexpected error occurred.";
  }
}

function prettySize(size?: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TestCaseGeneratorScreen({ route, navigation }: Props) {
  const { project, capture } = route.params || {};

  const [requirementText, setRequirementText] = useState(capture?.title || "");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [screenshotAttachment, setScreenshotAttachment] =
    useState<AttachmentItem | null>(null);
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [outputCards, setOutputCards] = useState<ScenarioItem[]>([]);

  const requirementRunLabel = useMemo(() => {
    return requirementText?.trim() || capture?.title || "Requirement Run";
  }, [requirementText, capture?.title]);

  const addAttachment = (item: AttachmentItem) => {
    setAttachments((prev) => [item, ...prev]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const pickFiles = async () => {
    try {
      setAttachModalVisible(false);

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      for (const asset of result.assets || []) {
        addAttachment({
          id: `${Date.now()}_${Math.random()}`,
          name: asset.name || "file",
          uri: asset.uri,
          mimeType: asset.mimeType || "application/octet-stream",
          size: asset.size ?? null,
          source: "files",
        });
      }
    } catch (error) {
      Alert.alert("Attachment Error", "Unable to select file from device.");
    }
  };

  const pickPhotos = async () => {
    try {
      setAttachModalVisible(false);

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      for (const asset of result.assets || []) {
        addAttachment({
          id: `${Date.now()}_${Math.random()}`,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          uri: asset.uri,
          mimeType: asset.mimeType || "image/jpeg",
          size: asset.fileSize ?? null,
          source: "photos",
        });
      }
    } catch (error) {
      Alert.alert("Attachment Error", "Unable to select image from gallery.");
    }
  };

  const pickScreenshot = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setScreenshotAttachment({
        id: `${Date.now()}_${Math.random()}`,
        name: asset.fileName || `screenshot_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize ?? null,
        source: "screenshot",
      });
    } catch (error) {
      Alert.alert("Screenshot Error", "Unable to select screenshot.");
    }
  };

  const buildRequirementPayload = () => {
    const attachmentSection =
      attachments.length > 0
        ? `\n\nAttached files:\n${attachments
            .map(
              (file, index) => `${index + 1}. ${file.name} (${file.mimeType})`,
            )
            .join("\n")}`
        : "";

    const screenshotSection = screenshotAttachment
      ? `\n\nScreenshot attached: ${screenshotAttachment.name} (${screenshotAttachment.mimeType})`
      : "";

    return `${requirementText?.trim() || ""}${attachmentSection}${screenshotSection}`.trim();
  };

  const buildApiPayload = () => ({
    projectId: project?.id || "",
    captureId: capture?.id || "",
    requirement: buildRequirementPayload(),
    attachments: attachments.map((item) => ({
      name: item.name,
      mimeType: item.mimeType,
      source: item.source,
      uri: item.uri,
    })),
    screenshot: screenshotAttachment
      ? {
          name: screenshotAttachment.name,
          mimeType: screenshotAttachment.mimeType,
          uri: screenshotAttachment.uri,
        }
      : null,
  });

  const normalizeResponse = (response: any) => {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (typeof response?.result === "string") return response.result;
    if (typeof response?.data?.result === "string") return response.data.result;
    if (typeof response?.content === "string") return response.content;
    if (typeof response?.data?.content === "string")
      return response.data.content;

    try {
      return JSON.stringify(response, null, 2);
    } catch {
      return String(response);
    }
  };

  const addScenario = (
    title: string,
    content: string,
    type: ScenarioItem["type"],
  ) => {
    setOutputCards((prev) => [
      {
        id: `${Date.now()}_${Math.random()}`,
        title,
        content,
        type,
        status: "pending",
      },
      ...prev,
    ]);
  };

  const updateScenarioStatus = (id: string, status: OutputStatus) => {
    setOutputCards((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const deleteScenario = (id: string) => {
    setOutputCards((prev) => prev.filter((item) => item.id !== id));
  };

  const validateBeforeGenerate = () => {
    if (
      !requirementText.trim() &&
      attachments.length === 0 &&
      !screenshotAttachment
    ) {
      Alert.alert(
        "Validation",
        "Please enter requirement text, attach files, or attach a screenshot.",
      );
      return false;
    }
    return true;
  };

  const handleGenerateTestCases = async () => {
    if (!validateBeforeGenerate()) return;

    try {
      setLoadingType("testcases");
      const fn: any = generateTestCases;
      const response = await fn(buildApiPayload());
      const result = normalizeResponse(response);
      addScenario("Test Cases", result, "testcases");
    } catch (error) {
      Alert.alert("Generator Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  const handleGenerateEdgeCases = async () => {
    if (!validateBeforeGenerate()) return;

    try {
      setLoadingType("edgecases");
      const fn: any = generateEdgeCases;
      const response = await fn(buildApiPayload());
      const result = normalizeResponse(response);
      addScenario("Edge Cases", result, "edgecases");
    } catch (error) {
      Alert.alert("Generator Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  const handleGenerateApiTests = async () => {
    if (!validateBeforeGenerate()) return;

    try {
      setLoadingType("apitests");
      const fn: any = generateTestCases;
      const response = await fn({
        ...buildApiPayload(),
        mode: "api_tests",
      });
      const result = normalizeResponse(response);
      addScenario("API Tests", result, "apitests");
    } catch (error) {
      Alert.alert("Generator Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  const handleGeneratePlaywright = async () => {
    if (!validateBeforeGenerate()) return;

    try {
      setLoadingType("playwright");
      const fn: any = generatePlaywrightScript;
      const response = await fn(buildApiPayload());
      const result = normalizeResponse(response);
      addScenario("Playwright Script", result, "playwright");
    } catch (error) {
      Alert.alert("Generator Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  //   const handleGenerateFromScreenshot = async () => {
  //     if (!screenshotAttachment) {
  //       Alert.alert("Validation", "Please attach a screenshot first.");
  //       return;
  //     }

  //     try {
  //       setLoadingType("screenshot");
  //       const fn: any = generateScreenshotSteps;
  //       const response = await fn(buildApiPayload());
  //       const result = normalizeResponse(response);
  //       addScenario("From Screenshot", result, "screenshot");
  //     } catch (error) {
  //       Alert.alert("Generator Error", getErrorMessage(error));
  //     } finally {
  //       setLoadingType(null);
  //     }
  //   };

  const renderAttachment = ({ item }: { item: AttachmentItem }) => (
    <View style={styles.attachmentCard}>
      <View style={styles.attachmentLeft}>
        <View style={styles.attachmentIconWrap}>
          <Ionicons
            name={getAttachmentIcon(item.mimeType, item.name) as any}
            size={18}
            color="#2563eb"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.attachmentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.attachmentMeta}>
            {item.source.toUpperCase()}
            {prettySize(item.size) ? ` • ${prettySize(item.size)}` : ""}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeAttachmentBtn}
        onPress={() => removeAttachment(item.id)}
      >
        <Ionicons name="close" size={16} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );

  const renderOutputCard = ({ item }: { item: ScenarioItem }) => (
    <View style={styles.outputHistoryCard}>
      <View style={styles.statusChipWrap}>
        <View style={styles.pendingChip}>
          <Text style={styles.pendingChipText}>
            {item.status === "approved"
              ? "Approved"
              : item.status === "needs_review"
                ? "Needs Review"
                : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.outputActionsRow}>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => updateScenarioStatus(item.id, "approved")}
        >
          <Text style={styles.approveBtnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reviewBtn}
          onPress={() => updateScenarioStatus(item.id, "needs_review")}
        >
          <Text style={styles.reviewBtnText}>Needs Review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteScenario(item.id)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.outputCardTitle}>{item.title}</Text>
      <Text style={styles.outputContent}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Test Case Generator"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputSection}>
          <TextInput
            value={requirementText}
            onChangeText={setRequirementText}
            placeholder="Enter requirement text"
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.requirementInput}
          />

          <Text style={styles.sectionTitle}>Attachments</Text>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => setAttachModalVisible(true)}
          >
            <Text style={styles.outlineButtonText}>Attach Files</Text>
          </TouchableOpacity>
          <Text style={styles.helperText}>
            Attach PDF, DOCX, JSON, XML, CSV, XLSX, images, or report files.
          </Text>

          <Text style={styles.sectionTitle}>Screenshot Attachment</Text>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={pickScreenshot}
          >
            <Text style={styles.outlineButtonText}>
              {screenshotAttachment ? "Change Screenshot" : "Attach Screenshot"}
            </Text>
          </TouchableOpacity>

          {attachments.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <FlatList
                data={attachments}
                keyExtractor={(item) => item.id}
                renderItem={renderAttachment}
                scrollEnabled={false}
              />
            </View>
          )}

          {screenshotAttachment && (
            <View style={styles.screenshotTag}>
              <Text style={styles.screenshotTagText}>
                Screenshot: {screenshotAttachment.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateTestCases}
            disabled={loadingType !== null}
          >
            {loadingType === "testcases" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate Test Cases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateEdgeCases}
            disabled={loadingType !== null}
          >
            {loadingType === "edgecases" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate Edge Cases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateApiTests}
            disabled={loadingType !== null}
          >
            {loadingType === "apitests" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate API Tests</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGeneratePlaywright}
            disabled={loadingType !== null}
          >
            {loadingType === "playwright" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Generate Playwright Script
              </Text>
            )}
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateFromScreenshot}
            disabled={loadingType !== null}
          >
            {loadingType === "screenshot" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Generate from Screenshot
              </Text>
            )}
          </TouchableOpacity> */}
        </View>

        <Text style={styles.runFoldersTitle}>Requirement Run Folders</Text>
        <View style={styles.runFolderCard}>
          <Text style={styles.runFolderTitle}>{requirementRunLabel}</Text>
          <Text style={styles.runFolderMeta}>
            {new Date().toLocaleString()} • {outputCards.length} outputs •{" "}
            {attachments.length} attachments
          </Text>
        </View>

        {outputCards.length > 0 && (
          <FlatList
            data={outputCards}
            keyExtractor={(item) => item.id}
            renderItem={renderOutputCard}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </ScrollView>

      <Modal
        visible={attachModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachModalVisible(false)}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setAttachModalVisible(false)}
        >
          <Pressable style={styles.bottomSheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Attach Files</Text>
            <Text style={styles.sheetSubtitle}>
              Choose files locally from your device. These are kept in app flow.
            </Text>

            <TouchableOpacity style={styles.sheetOption} onPress={pickPhotos}>
              <Ionicons name="images-outline" size={22} color="#111827" />
              <View style={styles.sheetTextWrap}>
                <Text style={styles.sheetOptionTitle}>Photos</Text>
                <Text style={styles.sheetOptionSub}>
                  Choose image from gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={pickFiles}>
              <Ionicons
                name="document-attach-outline"
                size={22}
                color="#111827"
              />
              <View style={styles.sheetTextWrap}>
                <Text style={styles.sheetOptionTitle}>Files</Text>
                <Text style={styles.sheetOptionSub}>
                  Pick PDF, DOCX, XLSX, CSV, JSON, XML or any file
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelSheetButton}
              onPress={() => setAttachModalVisible(false)}
            >
              <Text style={styles.cancelSheetButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  inputSection: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  requirementInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  outlineButton: {
    height: 52,
    borderWidth: 2,
    borderColor: "#2b5fd7",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  outlineButtonText: {
    color: "#2b5fd7",
    fontSize: 16,
    fontWeight: "700",
  },
  helperText: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  screenshotTag: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
  },
  screenshotTagText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  attachmentCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachmentLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  attachmentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eaf1fb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
  removeAttachmentBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSection: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#2454d3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  runFoldersTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  runFolderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  runFolderTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  runFolderMeta: {
    color: "#6b7280",
    fontSize: 14,
  },
  outputHistoryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusChipWrap: {
    marginBottom: 14,
  },
  pendingChip: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pendingChipText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4b5563",
  },
  outputActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  approveBtn: {
    backgroundColor: "#eaf1ff",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  approveBtnText: {
    color: "#2b5fd7",
    fontSize: 16,
    fontWeight: "800",
  },
  reviewBtn: {
    backgroundColor: "#fdecec",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  reviewBtnText: {
    color: "#c62828",
    fontSize: 16,
    fontWeight: "800",
  },
  deleteBtn: {
    backgroundColor: "#fdecec",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
  },
  deleteBtnText: {
    color: "#c62828",
    fontSize: 16,
    fontWeight: "800",
  },
  outputCardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  outputContent: {
    fontSize: 15,
    lineHeight: 26,
    color: "#111827",
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.24)",
    justifyContent: "flex-end",
  },
  bottomSheetCard: {
    backgroundColor: "#111827",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 56,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#6b7280",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#d1d5db",
    marginBottom: 18,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2937",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sheetTextWrap: {
    marginLeft: 14,
    flex: 1,
  },
  sheetOptionTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  sheetOptionSub: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 3,
  },
  cancelSheetButton: {
    marginTop: 6,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelSheetButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
