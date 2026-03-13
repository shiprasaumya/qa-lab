import React, { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";

type Capture = {
  id: string;
  title: string;
};

export default function EdgeCaseGeneratorScreen({
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
  const [requirementText, setRequirementText] = useState("");
  const [preview, setPreview] = useState("");

  const openMenu = () => {
    Alert.alert("Menu", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Projects", onPress: onGoProjects },
      { text: "Sign Out", style: "destructive", onPress: onSignOut },
    ]);
  };

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

  const generate = async () => {
    const trimmed = requirementText.trim();
    if (!trimmed) {
      return Alert.alert(
        "Missing requirement",
        "Please enter requirement text first.",
      );
    }

    const content = [
      `Feature: ${capture.title}`,
      "",
      "Edge Cases / Negative Scenarios:",
      "1. Verify behavior when required input is left empty.",
      "2. Verify invalid input is rejected with a proper validation message.",
      "3. Verify minimum boundary values are handled correctly.",
      "4. Verify maximum boundary values are handled correctly.",
      "5. Verify special characters and unexpected formats are handled safely.",
      "6. Verify duplicate values are handled correctly where applicable.",
      "7. Verify network interruption does not break the user flow.",
      "",
      "Requirement Context:",
      trimmed,
    ].join("\n");

    const latestId = await getLatestTestcaseId();
    if (!latestId) return;

    const { error } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", latestId);

    if (error) return Alert.alert("Save failed", error.message);

    setPreview(content);
    Alert.alert("Generated ✅", "Edge cases created.");
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        onMenuPress={openMenu}
        title="Edge Case Generator"
        subtitle={capture.title}
      />

      <Text style={styles.sectionTitle}>Requirement Input</Text>
      <TextInput
        style={styles.input}
        multiline
        textAlignVertical="top"
        placeholder="Paste feature requirement here..."
        value={requirementText}
        onChangeText={setRequirementText}
      />

      <Pressable style={styles.primaryBtn} onPress={generate}>
        <Text style={styles.primaryText}>Generate Edge Cases</Text>
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
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
  },
  primaryBtn: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: {
    color: "white",
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
