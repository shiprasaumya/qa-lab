import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { generateFromFileAI } from "../lib/aiApi";
import {
  PROMPT_LIBRARY,
  PromptMode,
  PromptTemplate,
} from "../lib/promptLibrary";
import { supabase } from "../lib/supabase";

type Capture = {
  id: string;
  title: string;
};

type CaptureFile = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_url: string;
  storage_path: string;
  created_at: string;
};

export default function FileUploadScreen({
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
  const [files, setFiles] = useState<CaptureFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generatingFileId, setGeneratingFileId] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [mode, setMode] = useState<PromptMode>("functional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const openMenu = () => {
    Alert.alert("Menu", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Projects", onPress: onGoProjects },
      { text: "Refresh", onPress: loadFiles },
      { text: "Sign Out", style: "destructive", onPress: onSignOut },
    ]);
  };

  const loadFiles = async () => {
    const { data, error } = await supabase
      .from("capture_files")
      .select("id,file_name,file_type,file_url,storage_path,created_at")
      .eq("capture_id", capture.id)
      .order("created_at", { ascending: false });

    if (error) return Alert.alert("Load failed", error.message);
    setFiles((data ?? []) as CaptureFile[]);
  };

  useEffect(() => {
    loadFiles();
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

  const saveGeneratedContent = async (content: string) => {
    const latestId = await getLatestTestcaseId();
    if (!latestId) {
      return Alert.alert(
        "Missing testcase",
        "No testcase row found for this capture.",
      );
    }

    const { error } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", latestId);

    if (error) return Alert.alert("Save failed", error.message);

    setPreview(content);
    Alert.alert("Generated ✅", "AI testcase created from uploaded file.");
  };

  const applyTemplate = (template: PromptTemplate) => {
    setSelectedTemplateId(template.id);
    setCustomPrompt(template.text);
  };

  const clearTemplate = () => {
    setSelectedTemplateId("");
    setCustomPrompt("");
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
          "text/plain",
          "image/*",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return Alert.alert("Error", "No file selected.");

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

      const safeName = (asset.name || "file")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const storagePath = `${user.id}/${capture.id}_${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("capture-files")
        .upload(storagePath, blob, {
          contentType: asset.mimeType || "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        setUploading(false);
        return Alert.alert("Upload failed", uploadError.message);
      }

      const { data: publicData } = supabase.storage
        .from("capture-files")
        .getPublicUrl(storagePath);

      const fileUrl = publicData.publicUrl;

      const { error: insertError } = await supabase
        .from("capture_files")
        .insert({
          capture_id: capture.id,
          user_id: user.id,
          file_name: asset.name || safeName,
          file_type: asset.mimeType || "unknown",
          file_url: fileUrl,
          storage_path: storagePath,
        });

      setUploading(false);

      if (insertError) {
        return Alert.alert("Save failed", insertError.message);
      }

      await loadFiles();
      Alert.alert("Uploaded ✅", "File uploaded successfully.");
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Upload error", e?.message ?? "Unknown error");
    }
  };

  const deleteFile = async (item: CaptureFile) => {
    Alert.alert("Delete file?", item.file_name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error: storageError } = await supabase.storage
            .from("capture-files")
            .remove([item.storage_path]);

          if (storageError)
            return Alert.alert("Delete failed", storageError.message);

          const { error: dbError } = await supabase
            .from("capture_files")
            .delete()
            .eq("id", item.id);

          if (dbError) return Alert.alert("Delete failed", dbError.message);

          await loadFiles();
        },
      },
    ]);
  };

  const generateFromFile = async (item: CaptureFile) => {
    try {
      setGeneratingFileId(item.id);

      const res = await generateFromFileAI({
        capture_title: capture.title,
        file_url: item.file_url,
        file_name: item.file_name,
        file_type: item.file_type || "",
        prompt_mode: mode,
        custom_prompt: customPrompt,
      });

      setGeneratingFileId(null);
      await saveGeneratedContent(res.content);
    } catch (e: any) {
      setGeneratingFileId(null);
      Alert.alert("Generation failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        //onMenuPress={openMenu}
        title="File Upload"
        subtitle={capture.title}
      />

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Upload Supporting Files</Text>
        <Text style={styles.heroSub}>
          Add PDF, Word, Excel, CSV, text, or image files. Then generate
          testcase drafts from them.
        </Text>
      </View>

      <Pressable style={styles.primaryBtn} onPress={pickFile}>
        <Text style={styles.primaryText}>
          {uploading ? "Uploading..." : "Upload File"}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Prompt Mode</Text>
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeBtn, mode === "functional" && styles.modeActive]}
          onPress={() => setMode("functional")}
        >
          <Text
            style={[
              styles.modeText,
              mode === "functional" && styles.modeTextActive,
            ]}
          >
            Functional
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeBtn, mode === "edge" && styles.modeActive]}
          onPress={() => setMode("edge")}
        >
          <Text
            style={[styles.modeText, mode === "edge" && styles.modeTextActive]}
          >
            Edge Case
          </Text>
        </Pressable>

        <Pressable
          style={[styles.modeBtn, mode === "automation" && styles.modeActive]}
          onPress={() => setMode("automation")}
        >
          <Text
            style={[
              styles.modeText,
              mode === "automation" && styles.modeTextActive,
            ]}
          >
            Automation
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Prompt Library
      </Text>
      <View style={styles.templateWrap}>
        {PROMPT_LIBRARY.map((template) => {
          const active = selectedTemplateId === template.id;
          return (
            <Pressable
              key={template.id}
              style={[styles.templateBtn, active && styles.templateBtnActive]}
              onPress={() => applyTemplate(template)}
            >
              <Text
                style={[
                  styles.templateText,
                  active && styles.templateTextActive,
                ]}
              >
                {template.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.clearBtn} onPress={clearTemplate}>
        <Text style={styles.clearBtnText}>Clear Prompt Template</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Additional AI Instructions
      </Text>
      <TextInput
        style={styles.inputSmall}
        multiline
        placeholder="Example: Focus on requirement gaps, payment validation, or automation-friendly output"
        value={customPrompt}
        onChangeText={setCustomPrompt}
      />

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
        Uploaded Files
      </Text>
      <ScrollView style={styles.listBox}>
        {files.length === 0 ? (
          <Text style={styles.emptyText}>No files uploaded yet.</Text>
        ) : (
          files.map((item) => (
            <View key={item.id} style={styles.fileCard}>
              <Text style={styles.fileName}>{item.file_name}</Text>
              <Text style={styles.fileMeta}>
                {item.file_type || "unknown"} •{" "}
                {new Date(item.created_at).toLocaleString()}
              </Text>

              <View style={styles.fileActions}>
                <Pressable onPress={() => Linking.openURL(item.file_url)}>
                  <Text style={styles.linkText}>Open</Text>
                </Pressable>

                <Pressable onPress={() => generateFromFile(item)}>
                  <Text style={styles.linkText}>
                    {generatingFileId === item.id
                      ? "Generating..."
                      : "Generate AI"}
                  </Text>
                </Pressable>

                <Pressable onPress={() => deleteFile(item)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
        Generated Preview
      </Text>
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
  heroCard: {
    backgroundColor: "#0A84FF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  heroTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },
  heroSub: {
    color: "#EAF2FF",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
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
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0A84FF",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "white",
  },
  modeActive: {
    backgroundColor: "#0A84FF",
  },
  modeText: {
    fontWeight: "700",
    color: "#0A84FF",
    fontSize: 13,
  },
  modeTextActive: {
    color: "white",
  },
  templateWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "white",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  templateBtnActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  templateText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13,
  },
  templateTextActive: {
    color: "#1D4ED8",
  },
  clearBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  clearBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },
  inputSmall: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "white",
  },
  listBox: {
    maxHeight: 260,
  },
  emptyText: {
    color: "#6B7280",
    marginTop: 8,
  },
  fileCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  fileMeta: {
    marginTop: 4,
    color: "#6B7280",
  },
  fileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  linkText: {
    color: "#0A84FF",
    fontWeight: "700",
  },
  deleteText: {
    color: "#DC2626",
    fontWeight: "700",
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
