import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { generateFromScreenshotAI } from "../lib/aiApi";
import { supabase } from "../lib/supabase";

type Capture = {
  id: string;
  title: string;
  created_at?: string;
  image_url?: string | null;
  playwright_script?: string | null;
};

export default function CaptureDetailScreen({
  capture,
  onBack,
  onEditTestcase,
  onOpenTraining,
}: {
  capture: Capture;
  onBack: () => void;
  onEditTestcase: () => void;
  onOpenTraining: () => void;
}) {
  const [latest, setLatest] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(
    capture.image_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [requirementText, setRequirementText] = useState("");
  const [generatingShot, setGeneratingShot] = useState(false);
  const [playwrightScript, setPlaywrightScript] = useState(
    capture.playwright_script ?? "",
  );
  const [sharingPlaywright, setSharingPlaywright] = useState(false);

  const loadLatestTestcase = async () => {
    const { data, error } = await supabase
      .from("testcases")
      .select("content,updated_at")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) return Alert.alert("Error", error.message);
    setLatest(data?.[0]?.content ?? "");
  };

  const loadCapture = async () => {
    const { data, error } = await supabase
      .from("captures")
      .select("image_url,playwright_script")
      .eq("id", capture.id)
      .single();

    if (!error) {
      setImageUrl(data?.image_url ?? null);
      setPlaywrightScript(data?.playwright_script ?? "");
    }
  };

  useEffect(() => {
    loadLatestTestcase();
    loadCapture();
  }, []);

  const getLatestTestcaseId = async () => {
    const { data, error } = await supabase
      .from("testcases")
      .select("id")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      Alert.alert("Error", error.message);
      return null;
    }

    return data?.[0]?.id ?? null;
  };

  const saveGeneratedContent = async (
    content: string,
    successMessage: string,
  ) => {
    const latestId = await getLatestTestcaseId();
    if (!latestId) {
      return Alert.alert(
        "Missing testcase",
        "No testcase row found for this capture.",
      );
    }

    const { error: updateErr } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", latestId);

    if (updateErr) return Alert.alert("Save failed", updateErr.message);

    setLatest(content);
    Alert.alert("Generated ✅", successMessage);
  };

  const savePlaywrightToCapture = async (script: string) => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return Alert.alert("Auth error", "Please sign in again.");
    }

    const { error } = await supabase
      .from("captures")
      .update({
        playwright_script: script,
        user_id: user.id,
      })
      .eq("id", capture.id);

    if (error) {
      return Alert.alert("Save failed", error.message);
    }

    setPlaywrightScript(script);
  };

  const buildStructuredRequirementOutput = (
    featureTitle: string,
    requirement: string,
  ) => {
    const lowerReq = requirement.toLowerCase();

    const uiValidations = [
      `1. Verify the ${featureTitle} screen or feature entry point is accessible.`,
      "2. Verify all key labels, buttons, and input areas related to this feature are visible.",
      "3. Verify layout appears consistent and usable on mobile.",
    ];

    const functional = [
      "1. Launch the application.",
      `2. Navigate to the ${featureTitle} feature.`,
      "3. Review the provided requirement and perform the intended user action.",
      "4. Enter valid input data where applicable.",
      "5. Submit, continue, or confirm the action.",
      "6. Verify the expected result matches the requirement.",
    ];

    const negatives = [
      "1. Verify behavior when required input is left empty.",
      "2. Verify invalid input is rejected with a proper validation or error message.",
      "3. Verify the user remains in a stable state when the action fails.",
    ];

    if (
      lowerReq.includes("login") ||
      lowerReq.includes("password") ||
      lowerReq.includes("email")
    ) {
      uiValidations.splice(
        1,
        0,
        "2. Verify email and password related fields are visible if applicable.",
      );
      negatives.push("4. Verify incorrect credentials show an error message.");
    }

    if (
      lowerReq.includes("transfer") ||
      lowerReq.includes("payment") ||
      lowerReq.includes("amount")
    ) {
      negatives.push(
        "4. Verify zero, negative, or excessive amount values are handled correctly.",
      );
      negatives.push(
        "5. Verify insufficient balance or failed transaction scenarios are handled correctly.",
      );
    }

    if (lowerReq.includes("search")) {
      negatives.push(
        "4. Verify empty search and no-result scenarios are handled gracefully.",
      );
    }

    const playwrightNotes = [
      "- Add stable selectors such as data-testid attributes for important fields and buttons.",
      "- Add assertions for success and validation messages.",
      "- Add navigation or URL assertions where applicable.",
    ];

    return [
      `Feature: ${featureTitle}`,
      "",
      "UI Validations:",
      ...uiValidations,
      "",
      "Functional Test Case:",
      ...functional,
      "",
      "Negative / Edge Cases:",
      ...negatives,
      "",
      "Playwright Notes:",
      ...playwrightNotes,
      "",
      "Requirement Context:",
      requirement,
    ].join("\n");
  };

  const appendEdgeCasesToStructuredOutput = (baseContent: string) => {
    const extraEdgeCases = [
      "",
      "Additional Edge Cases:",
      "1. Verify minimum boundary values are accepted or rejected correctly.",
      "2. Verify maximum boundary values are accepted or rejected correctly.",
      "3. Verify special characters and unexpected input formats are handled safely.",
      "4. Verify duplicate or already-used values are handled correctly.",
      "5. Verify network interruption or slow response does not break the user flow.",
    ].join("\n");

    return `${baseContent}\n${extraEdgeCases}`;
  };

  const buildPlaywrightScript = (featureTitle: string, baseText: string) => {
    const safeName = featureTitle.replace(/'/g, "\\'");
    return [
      "import { test, expect } from '@playwright/test';",
      "",
      `test('${safeName} flow', async ({ page }) => {`,
      "  // TODO: replace with real application URL",
      "  await page.goto('https://your-app-url.com');",
      "  await page.waitForLoadState('networkidle');",
      "",
      "  // Generated context:",
      `  // ${featureTitle}`,
      "  // Review selectors and assertions before running",
      "",
      "  // Example steps:",
      "  // await page.click('[data-testid=\"nav-target\"]');",
      "  // await page.fill('[data-testid=\"input-1\"]', 'sample');",
      "  // await page.click('[data-testid=\"submit-button\"]');",
      "",
      "  // Example assertion:",
      "  await expect(page).toBeTruthy();",
      "});",
      "",
      "/*",
      "Source testcase / requirement context:",
      baseText,
      "*/",
    ].join("\n");
  };

  const pickAndUploadImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert("Permission needed", "Please allow photo access.");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return Alert.alert("Error", "No image selected.");

      setUploading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setUploading(false);
        return Alert.alert("Auth error", "Please sign in again.");
      }

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const extension = asset.uri.split(".").pop() || "jpg";
      const filePath = `${user.id}/${capture.id}_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(filePath, blob, {
          contentType: asset.mimeType || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        setUploading(false);
        return Alert.alert("Upload failed", uploadError.message);
      }

      const { data: publicData } = supabase.storage
        .from("captures")
        .getPublicUrl(filePath);

      const publicUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("captures")
        .update({ image_url: publicUrl, user_id: user.id })
        .eq("id", capture.id);

      setUploading(false);

      if (updateError) {
        return Alert.alert("Save failed", updateError.message);
      }

      setImageUrl(publicUrl);
      Alert.alert("Success", "Screenshot uploaded successfully.");
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Upload error", e?.message ?? "Unknown error");
    }
  };

  const generateRequirementTestcase = async () => {
    const trimmed = requirementText.trim();
    if (!trimmed) {
      return Alert.alert(
        "Missing requirement",
        "Please enter requirement text first.",
      );
    }

    const structured = buildStructuredRequirementOutput(capture.title, trimmed);
    await saveGeneratedContent(
      structured,
      "Structured testcase created from requirement.",
    );
  };

  const generateEdgeCases = async () => {
    const trimmed = requirementText.trim();
    const baseContent =
      latest?.trim() ||
      (trimmed ? buildStructuredRequirementOutput(capture.title, trimmed) : "");

    if (!baseContent) {
      return Alert.alert(
        "Missing requirement",
        "Please enter requirement text or generate a testcase first.",
      );
    }

    const finalContent = appendEdgeCasesToStructuredOutput(baseContent);
    await saveGeneratedContent(
      finalContent,
      "Edge cases added to structured testcase.",
    );
  };

  const generatePlaywrightScript = async () => {
    const baseText = latest?.trim() || requirementText.trim();

    if (!baseText) {
      return Alert.alert(
        "Nothing to generate from",
        "Please generate a testcase or enter requirement text first.",
      );
    }

    const script = buildPlaywrightScript(capture.title, baseText);
    await savePlaywrightToCapture(script);
    Alert.alert(
      "Playwright Ready ✅",
      "Separate Playwright script generated and saved.",
    );
  };

  const downloadPlaywrightScript = async () => {
    if (!playwrightScript.trim()) {
      return Alert.alert("No script", "Generate Playwright script first.");
    }

    try {
      setSharingPlaywright(true);

      const baseDir =
        (FileSystem as any).cacheDirectory ||
        (FileSystem as any).documentDirectory;

      if (!baseDir) {
        setSharingPlaywright(false);
        return Alert.alert("Export failed", "No local directory available.");
      }

      const fileName = `${
        capture.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "playwright-script"
      }_${Date.now()}.spec.ts`;

      const fileUri = `${baseDir}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, playwrightScript, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setSharingPlaywright(false);
        return Alert.alert(
          "Sharing not available",
          `Script saved at:\n${fileUri}`,
        );
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Share Playwright Script",
        UTI: "public.plain-text",
      });

      setSharingPlaywright(false);
    } catch (e: any) {
      setSharingPlaywright(false);
      Alert.alert("Download failed", e?.message ?? "Unknown error");
    }
  };

  const generateFromScreenshot = async () => {
    if (!imageUrl) {
      return Alert.alert("No screenshot", "Please upload a screenshot first.");
    }

    try {
      setGeneratingShot(true);

      const res = await generateFromScreenshotAI({
        capture_title: capture.title,
        image_url: imageUrl,
        requirement_text: requirementText.trim(),
      });

      setGeneratingShot(false);
      await saveGeneratedContent(
        res.content,
        "Structured screenshot-based testcase generated.",
      );
    } catch (e: any) {
      setGeneratingShot(false);
      Alert.alert("Screenshot AI failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        title={capture.title}
        subtitle="Requirement, screenshot, testcase, and Playwright workspace"
        rightText="Refresh"
        onRightPress={() => {
          loadLatestTestcase();
          loadCapture();
        }}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Capture Workspace</Text>
        <Text style={styles.sectionSub}>
          Upload a screenshot, paste requirement text, generate structured
          tests, and export Playwright.
        </Text>

        <Pressable style={styles.secondaryBtn} onPress={pickAndUploadImage}>
          <Text style={styles.secondaryText}>
            {uploading ? "Uploading..." : "Upload Screenshot"}
          </Text>
        </Pressable>
      </View>

      {imageUrl ? (
        <View style={styles.imageCard}>
          <Text style={styles.smallLabel}>Screenshot Preview</Text>
          <View style={styles.imageBox}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.smallLabel}>Screenshot Preview</Text>
          <View style={styles.emptyImageBox}>
            <Text style={styles.emptyText}>No screenshot uploaded yet.</Text>
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.smallLabel}>Requirement Text</Text>
        <TextInput
          style={styles.requirementInput}
          multiline
          textAlignVertical="top"
          placeholder="Paste feature requirement here..."
          placeholderTextColor="#9CA3AF"
          value={requirementText}
          onChangeText={setRequirementText}
        />

        <View style={styles.actionsColumn}>
          <Pressable
            style={styles.primaryBtn}
            onPress={generateRequirementTestcase}
          >
            <Text style={styles.primaryText}>Generate from Requirement</Text>
          </Pressable>

          <Pressable style={styles.primaryBtn} onPress={generateEdgeCases}>
            <Text style={styles.primaryText}>Generate Edge Cases</Text>
          </Pressable>

          <Pressable
            style={styles.primaryBtn}
            onPress={generatePlaywrightScript}
          >
            <Text style={styles.primaryText}>Generate Playwright Script</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={downloadPlaywrightScript}
          >
            <Text style={styles.secondaryText}>
              {sharingPlaywright
                ? "Preparing Download..."
                : "Download / Share Playwright"}
            </Text>
          </Pressable>

          <Pressable style={styles.primaryBtn} onPress={generateFromScreenshot}>
            <Text style={styles.primaryText}>
              {generatingShot
                ? "Generating from Screenshot..."
                : "Generate from Screenshot"}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={onEditTestcase}>
            <Text style={styles.secondaryText}>Edit Testcase</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={onOpenTraining}>
            <Text style={styles.secondaryText}>Training Dataset</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.smallLabel}>Latest Testcase Preview</Text>
        <ScrollView style={styles.previewBox}>
          <Text style={styles.previewText}>
            {latest?.trim()
              ? latest
              : "No testcase content yet. Generate from requirement, edge cases, Playwright, or screenshot."}
          </Text>
        </ScrollView>
      </View>

      <View style={[styles.card, { marginBottom: 24 }]}>
        <Text style={styles.smallLabel}>Playwright Output</Text>
        <ScrollView style={styles.previewBox}>
          <Text style={styles.previewText}>
            {playwrightScript?.trim()
              ? playwrightScript
              : "No Playwright script generated yet."}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#F3F7FF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  imageCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 20,
  },
  smallLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 15,
  },
  actionsColumn: {
    gap: 10,
  },
  imageBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    overflow: "hidden",
    height: 220,
    backgroundColor: "#F9FAFB",
  },
  emptyImageBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  emptyText: {
    color: "#6B7280",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  requirementInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#FFF",
    color: "#111827",
  },
  previewBox: {
    maxHeight: 220,
  },
  previewText: {
    color: "#374151",
    lineHeight: 20,
  },
});
