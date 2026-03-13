import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";

type Capture = {
  id: string;
  title: string;
  playwright_script?: string | null;
};

export default function PlaywrightGeneratorScreen({
  capture,
  onBack,
  onSignOut,
  onGoProjects,
}: {
  capture: Capture;
  onBack: () => void;
  onSignOut: () => void;
  onGoProjects: () => void;
}) {
  const [preview, setPreview] = useState(capture.playwright_script ?? "");
  const [sharing, setSharing] = useState(false);

  const openMenu = () => {
    Alert.alert("Menu", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Projects", onPress: onGoProjects },
      { text: "Sign Out", style: "destructive", onPress: onSignOut },
    ]);
  };

  const loadLatestTestcase = async () => {
    const { data, error } = await supabase
      .from("testcases")
      .select("content")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      Alert.alert("Error", error.message);
      return null;
    }

    return data?.[0]?.content ?? "";
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

  const generate = async () => {
    const testcase = await loadLatestTestcase();
    if (!testcase) {
      return Alert.alert("No testcase", "Generate or write a testcase first.");
    }

    const script = buildPlaywrightScript(capture.title, testcase);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return Alert.alert("Auth error", "Please sign in again.");
    }

    const { error } = await supabase
      .from("captures")
      .update({ playwright_script: script, user_id: user.id })
      .eq("id", capture.id);

    if (error) return Alert.alert("Save failed", error.message);

    setPreview(script);
    Alert.alert("Generated ✅", "Playwright script created and saved.");
  };

  const download = async () => {
    if (!preview.trim()) {
      return Alert.alert("No script", "Generate Playwright script first.");
    }

    try {
      setSharing(true);

      const baseDir =
        (FileSystem as any).cacheDirectory ||
        (FileSystem as any).documentDirectory;

      if (!baseDir) {
        setSharing(false);
        return Alert.alert("Export failed", "No local directory available.");
      }

      const fileName = `${
        capture.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "playwright-script"
      }_${Date.now()}.spec.ts`;

      const fileUri = `${baseDir}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, preview, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setSharing(false);
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

      setSharing(false);
    } catch (e: any) {
      setSharing(false);
      Alert.alert("Download failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        onMenuPress={openMenu}
        title="Playwright Generator"
        subtitle={capture.title}
      />

      <Pressable style={styles.primaryBtn} onPress={generate}>
        <Text style={styles.primaryText}>Generate Playwright Script</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={download}>
        <Text style={styles.secondaryText}>
          {sharing ? "Preparing Download..." : "Download / Share Playwright"}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Preview</Text>
      <ScrollView style={styles.previewBox}>
        <Text style={styles.previewText}>
          {preview || "No generated output yet."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#F8FAFC",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    color: "#111827",
  },
  primaryBtn: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "white",
    marginTop: 12,
  },
  secondaryText: {
    color: "#0A84FF",
    fontWeight: "800",
    fontSize: 15,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
    flex: 1,
  },
  previewText: {
    color: "#374151",
    lineHeight: 20,
  },
});
