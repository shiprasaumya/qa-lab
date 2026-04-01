import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
<AppHeader title="AI Test Creation" current="generators" />;

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

import {
  generateEdgeCases,
  generatePlaywrightScript,
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
  source: "camera" | "photos" | "files";
};

type OutputType = "testcases" | "edgecases" | "screenshots" | "playwright";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function getAttachmentIcon(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();

  if (mimeType.startsWith("image/")) return "image-outline";
  if (mimeType === "application/pdf" || lower.endsWith(".pdf"))
    return "document-text-outline";
  if (lower.endsWith(".doc") || lower.endsWith(".docx"))
    return "document-outline";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "grid-outline";
  return "attach-outline";
}

export default function GeneratorsScreen({ route, navigation }: Props) {
  const { project, capture } = route.params || {};

  const [requirement, setRequirement] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachModalVisible, setAttachModalVisible] = useState(false);

  const [loadingType, setLoadingType] = useState<OutputType | null>(null);
  const [activeTab, setActiveTab] = useState<OutputType>("testcases");

  const [testCasesResult, setTestCasesResult] = useState("");
  const [edgeCasesResult, setEdgeCasesResult] = useState("");
  const [screenshotResult, setScreenshotResult] = useState("");
  const [playwrightResult, setPlaywrightResult] = useState("");

  const currentOutput = useMemo(() => {
    switch (activeTab) {
      case "testcases":
        return testCasesResult;
      case "edgecases":
        return edgeCasesResult;
      case "screenshots":
        return screenshotResult;
      case "playwright":
        return playwrightResult;
      default:
        return "";
    }
  }, [
    activeTab,
    testCasesResult,
    edgeCasesResult,
    screenshotResult,
    playwrightResult,
  ]);

  const addAttachment = (item: AttachmentItem) => {
    setAttachments((prev) => [item, ...prev]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const openFilesPicker = async () => {
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

  const openPhotosPicker = async () => {
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

  const openCamera = async () => {
    try {
      setAttachModalVisible(false);

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      addAttachment({
        id: `${Date.now()}_${Math.random()}`,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize ?? null,
        source: "camera",
      });
    } catch (error) {
      Alert.alert("Attachment Error", "Unable to open camera.");
    }
  };

  const validateRequirement = () => {
    if (!requirement.trim() && attachments.length === 0) {
      Alert.alert(
        "Validation",
        "Please enter requirement text or attach at least one file.",
      );
      return false;
    }
    return true;
  };

  const buildRequirementPayload = () => {
    const attachmentLines =
      attachments.length > 0
        ? `\n\nAttached files:\n${attachments
            .map(
              (file, index) => `${index + 1}. ${file.name} (${file.mimeType})`,
            )
            .join("\n")}`
        : "";

    return `${requirement.trim()}${attachmentLines}`.trim();
  };

  const normalizeResult = (response: any) => {
    if (!response) return "";
    if (typeof response === "string") return response;
    if (typeof response.result === "string") return response.result;
    if (typeof response.data?.result === "string") return response.data.result;
    return JSON.stringify(response, null, 2);
  };

  const buildApiPayload = () => ({
    projectId: project?.id || "",
    captureId: capture?.id || "",
    requirement: buildRequirementPayload(),
    attachments: attachments.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      source: file.source,
    })),
  });

  const handleGenerateTestCases = async () => {
    if (!validateRequirement()) return;

    try {
      setLoadingType("testcases");
      const fn: any = generateTestCases;
      const response = await fn(buildApiPayload());
      setTestCasesResult(normalizeResult(response));
      setActiveTab("testcases");
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  const handleGenerateEdgeCases = async () => {
    if (!validateRequirement()) return;

    try {
      setLoadingType("edgecases");
      const fn: any = generateEdgeCases;
      const response = await fn(buildApiPayload());
      setEdgeCasesResult(normalizeResult(response));
      setActiveTab("edgecases");
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

  // const handleGenerateScreenshots = async () => {
  //   if (!validateRequirement()) return;

  //   try {
  //     setLoadingType("screenshots");
  //     //const fn: any = reviewGeneratedOutput;
  //     const response = await fn(buildApiPayload());
  //     setScreenshotResult(normalizeResult(response));
  //     setActiveTab("screenshots");
  //   } catch (error) {
  //     Alert.alert("Screenshot Error", getErrorMessage(error));
  //   } finally {
  //     setLoadingType(null);
  //   }
  // };

  const handleGeneratePlaywright = async () => {
    if (!validateRequirement()) return;

    try {
      setLoadingType("playwright");
      const fn: any = generatePlaywrightScript;
      const response = await fn(buildApiPayload());
      setPlaywrightResult(normalizeResult(response));
      setActiveTab("playwright");
    } catch (error) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setLoadingType(null);
    }
  };

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
          <Text style={styles.attachmentMeta} numberOfLines={1}>
            {item.source.toUpperCase()}
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

  const TabButton = ({
    label,
    value,
  }: {
    label: string;
    value: OutputType;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === value && styles.tabButtonActive]}
      onPress={() => setActiveTab(value)}
    >
      <Text
        style={[
          styles.tabButtonText,
          activeTab === value && styles.tabButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* <AppHeaderMenu
        title="Generators"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      /> */}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.projectCard}>
          <Text style={styles.projectLabel}>Project</Text>
          <Text style={styles.projectName}>
            {project?.name || "Untitled Project"}
          </Text>
          {!!capture?.title && (
            <Text style={styles.captureName}>Capture: {capture.title}</Text>
          )}
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Requirement</Text>
          <Text style={styles.sectionSubtitle}>
            Type requirement text or attach files using the plus icon.
          </Text>

          <View style={styles.requirementInputWrap}>
            <TextInput
              value={requirement}
              onChangeText={setRequirement}
              placeholder="Enter requirement here..."
              placeholderTextColor="#9ca3af"
              multiline
              style={styles.requirementInput}
            />

            <TouchableOpacity
              style={styles.plusButton}
              onPress={() => setAttachModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {attachments.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Text style={styles.attachmentsTitle}>Attached Files</Text>
              <FlatList
                data={attachments}
                keyExtractor={(item) => item.id}
                renderItem={renderAttachment}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>

        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Generate</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerateTestCases}
            disabled={loadingType !== null}
          >
            {loadingType === "testcases" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Generate Test Cases</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGenerateEdgeCases}
            disabled={loadingType !== null}
          >
            {loadingType === "edgecases" ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Generate Edge Cases
              </Text>
            )}
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGenerateScreenshots}
            disabled={loadingType !== null}
          >
            {loadingType === "screenshots" ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Generate Screenshot Steps
              </Text>
            )}
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGeneratePlaywright}
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

        <View style={styles.outputCard}>
          <Text style={styles.sectionTitle}>Generated Output</Text>

          <View style={styles.tabsRow}>
            <TabButton label="Test Cases" value="testcases" />
            <TabButton label="Edge Cases" value="edgecases" />
          </View>

          <View style={styles.tabsRow}>
            <TabButton label="Screenshots" value="screenshots" />
            <TabButton label="Playwright" value="playwright" />
          </View>

          <View style={styles.outputBox}>
            <Text style={styles.outputText}>
              {currentOutput || "No generated output yet."}
            </Text>
          </View>
        </View>
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

            <Text style={styles.sheetTitle}>Attach Requirement</Text>
            <Text style={styles.sheetSubtitle}>
              Add image, document, PDF, Word, Excel, or any file from your
              phone.
            </Text>

            <TouchableOpacity style={styles.sheetOption} onPress={openCamera}>
              <Ionicons name="camera-outline" size={22} color="#111827" />
              <View style={styles.sheetOptionTextWrap}>
                <Text style={styles.sheetOptionTitle}>Camera</Text>
                <Text style={styles.sheetOptionSub}>Capture new image</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={openPhotosPicker}
            >
              <Ionicons name="images-outline" size={22} color="#111827" />
              <View style={styles.sheetOptionTextWrap}>
                <Text style={styles.sheetOptionTitle}>Photos</Text>
                <Text style={styles.sheetOptionSub}>
                  Choose image from gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={openFilesPicker}
            >
              <Ionicons
                name="document-attach-outline"
                size={22}
                color="#111827"
              />
              <View style={styles.sheetOptionTextWrap}>
                <Text style={styles.sheetOptionTitle}>Files</Text>
                <Text style={styles.sheetOptionSub}>
                  Pick PDF, DOCX, XLSX, TXT, image, or any file
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
  safe: { flex: 1, backgroundColor: "#eef2f5" },
  content: { padding: 16, paddingBottom: 40 },
  projectCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  projectLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  projectName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  captureName: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
  },
  inputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  outputCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6b7280",
    marginBottom: 14,
  },
  requirementInputWrap: {
    position: "relative",
  },
  requirementInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 60,
    paddingRight: 70,
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
  },
  plusButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentsSection: { marginTop: 16 },
  attachmentsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
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
  primaryButton: {
    height: 48,
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
    height: 48,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: "#2563eb",
  },
  tabButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  outputBox: {
    marginTop: 8,
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    padding: 14,
  },
  outputText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#111827",
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.22)",
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
  sheetOptionTextWrap: {
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
