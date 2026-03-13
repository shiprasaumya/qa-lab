import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { supabase } from "../lib/supabase";

type TrainingExample = {
  id: string;
  input_text: string;
  output_text: string;
  approved_at: string;
  source: string | null;
};

export default function TrainingExamplesScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [items, setItems] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("training_examples")
      .select("id,input_text,output_text,approved_at,source")
      .order("approved_at", { ascending: false });

    setLoading(false);

    if (error) return Alert.alert("Error", error.message);
    setItems((data ?? []) as TrainingExample[]);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("training_examples")
      .delete()
      .eq("id", id);

    if (error) return Alert.alert("Delete failed", error.message);
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete?", "Remove this training example?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(id) },
    ]);
  };

  const csvEscape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const buildCsv = (rows: TrainingExample[]) => {
    const header = ["approved_at", "source", "input_text", "output_text"];
    const lines = [header.join(",")];

    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.approved_at),
          csvEscape(r.source ?? ""),
          csvEscape(r.input_text),
          csvEscape(r.output_text),
        ].join(","),
      );
    }

    return lines.join("\n");
  };

  const exportCsv = async () => {
    try {
      setExporting(true);

      const { data, error } = await supabase
        .from("training_examples")
        .select("id,input_text,output_text,approved_at,source")
        .order("approved_at", { ascending: false });

      if (error) {
        setExporting(false);
        return Alert.alert("Export failed", error.message);
      }

      const rows = (data ?? []) as TrainingExample[];
      if (rows.length === 0) {
        setExporting(false);
        return Alert.alert("Nothing to export", "No training examples yet.");
      }

      const csv = buildCsv(rows);

      const baseDir =
        (FileSystem as any).cacheDirectory ||
        (FileSystem as any).documentDirectory;

      if (!baseDir) {
        setExporting(false);
        return Alert.alert("Export failed", "No local directory available.");
      }

      const fileName = `training_examples_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;

      const fileUri = `${baseDir}${fileName}`;

      await (FileSystem as any).writeAsStringAsync(fileUri, csv, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setExporting(false);
        return Alert.alert(
          "Sharing not available",
          `CSV saved at:\n${fileUri}`,
        );
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Training Dataset (CSV)",
        UTI: "public.comma-separated-values-text",
      });

      setExporting(false);
    } catch (e: any) {
      setExporting(false);
      Alert.alert("Export error", e?.message ?? "Unknown error");
    }
  };

  const renderItem = ({ item }: { item: TrainingExample }) => (
    <View style={styles.card}>
      <Text style={styles.meta}>
        {new Date(item.approved_at).toLocaleString()} •{" "}
        {item.source ?? "unknown"}
      </Text>

      <Text style={styles.label}>Input</Text>
      <Text style={styles.text}>{item.input_text}</Text>

      <Text style={styles.label}>Output (Approved testcase)</Text>
      <Text style={styles.text}>{item.output_text}</Text>

      <View style={styles.actions}>
        <Pressable onPress={() => confirmDelete(item.id)}>
          <Text style={styles.delete}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        title="Training Dataset"
        subtitle="Approved examples used to train future AI outputs"
        rightText={loading ? "Loading..." : "Refresh"}
        onRightPress={load}
      />

      <Pressable style={styles.exportBtn} onPress={exportCsv}>
        <Text style={styles.exportText}>
          {exporting ? "Exporting CSV..." : "Export CSV"}
        </Text>
      </Pressable>

      <FlatList
        style={{ marginTop: 14 }}
        data={items}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No training examples yet. Approve a testcase first.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
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
  exportBtn: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  exportText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  card: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
  },
  meta: {
    color: "#6B7280",
    marginBottom: 10,
  },
  label: {
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
    color: "#111827",
  },
  text: {
    color: "#374151",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  delete: {
    color: "#DC2626",
    fontWeight: "800",
  },
  emptyText: {
    marginTop: 16,
    color: "#6B7280",
  },
});
