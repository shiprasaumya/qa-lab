import React, { useEffect, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
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
};

export default function EdgeCasesScreen({
  capture,
  onBack,
}: {
  capture: Capture;
  onBack: () => void;
}) {
  const [latest, setLatest] = useState("");

  const showActions = () => {
    Alert.alert("Actions", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Refresh",
        onPress: loadLatest,
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
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

  const loadLatest = async () => {
    const { data, error } = await supabase
      .from("testcases")
      .select("content")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) return Alert.alert("Error", error.message);
    setLatest(data?.[0]?.content ?? "");
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const appendEdgeCases = async () => {
    Keyboard.dismiss();

    if (!latest.trim()) {
      return Alert.alert("Missing testcase", "Generate a testcase first.");
    }

    const extra = [
      "",
      "Additional Edge Cases:",
      "1. Verify minimum boundary values are accepted or rejected correctly.",
      "2. Verify maximum boundary values are accepted or rejected correctly.",
      "3. Verify special characters and unexpected input formats are handled safely.",
      "4. Verify duplicate or already-used values are handled correctly.",
      "5. Verify network interruption or slow response does not break the user flow.",
    ].join("\n");

    const content = `${latest}${extra}`;
    const latestId = await getLatestTestcaseId();
    if (!latestId) return;

    const { error } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", latestId);

    if (error) return Alert.alert("Generate failed", error.message);

    setLatest(content);
    Alert.alert("Generated ✅", "Edge cases added.");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#F8FAFC" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <AppHeader
          showBack
          onBack={onBack}
          title="Edge Case Generator"
          subtitle={capture.title}
          rightText="Actions"
          onRightPress={showActions}
        />

        <Pressable style={styles.primaryBtn} onPress={appendEdgeCases}>
          <Text style={styles.primaryText}>Generate Edge Cases</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Latest Testcase Preview
        </Text>
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            {latest?.trim() ? latest : "No testcase content yet."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
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
  previewBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "white",
  },
  previewText: {
    opacity: 0.95,
    lineHeight: 20,
    color: "#374151",
  },
});
