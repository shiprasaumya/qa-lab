import React, { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Capture = { id: string; title: string; created_at?: string };

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

  useEffect(() => {
    loadLatestTestcase();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <Pressable onPress={loadLatestTestcase}>
          <Text style={styles.link}>Refresh</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{capture.title}</Text>
      <Text style={styles.sub}>Capture details</Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.primaryBtn} onPress={onEditTestcase}>
          <Text style={styles.primaryText}>Edit Testcase</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={onOpenTraining}>
          <Text style={styles.secondaryText}>Training Dataset</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Latest testcase (preview)</Text>

      <ScrollView style={styles.previewBox}>
        <Text style={styles.previewText}>
          {latest?.trim()
            ? latest
            : "No testcase content yet. Tap “Edit Testcase” to write steps."}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  back: { fontSize: 16 },
  link: { fontSize: 16, color: "#007AFF", fontWeight: "600" },

  title: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  sub: { opacity: 0.7, marginTop: 6, marginBottom: 14 },

  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "800" },

  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#007AFF", fontWeight: "800" },

  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flex: 1,
  },
  previewText: { opacity: 0.9, lineHeight: 20 },
});
