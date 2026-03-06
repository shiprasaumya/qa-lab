import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  };

  const load = async () => {
    const userId = await getUserId();
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

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
    const userId = await getUserId();
    if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

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

  // --- CSV helpers ---
  const csvEscape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
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
      const userId = await getUserId();
      if (!userId) return Alert.alert("Not signed in", "Please sign in again.");

      setExporting(true);

      // Pull fresh data
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

      const fileName = `training_examples_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.csv`;

      if (!(FileSystem as any).documentDirectory) {
        setExporting(false);
        return Alert.alert("Export failed", "No document directory available.");
      }

      const fileUri = (FileSystem as any).documentDirectory + fileName;

      await (FileSystem as any).writeAsStringAsync(fileUri, csv, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setExporting(false);
        return Alert.alert(
          "Sharing not available",
          "Your device cannot open a share sheet. The CSV is saved in the app document directory.",
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
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            title={exporting ? "Exporting..." : "Export CSV"}
            onPress={exportCsv}
            disabled={exporting}
          />
          <Button
            title={loading ? "Refreshing..." : "Refresh"}
            onPress={load}
            disabled={loading}
          />
        </View>
      </View>

      <Text style={styles.title}>Training Dataset</Text>
      <Text style={styles.sub}>
        These are the examples saved when you press “Approve Training”.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7, marginTop: 12 }}>
            No training examples yet. Approve a testcase first.
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  back: { fontSize: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sub: { opacity: 0.7, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  meta: { opacity: 0.7, marginBottom: 10 },
  label: { fontWeight: "700", marginTop: 8, marginBottom: 4 },
  text: { opacity: 0.9 },
  actions: { marginTop: 10, flexDirection: "row", justifyContent: "flex-end" },
  delete: { color: "red", fontWeight: "700" },
});
