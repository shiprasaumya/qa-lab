import * as ImagePicker from "expo-image-picker";
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
import {
  PROMPT_LIBRARY,
  PromptMode,
  PromptTemplate,
} from "../lib/promptLibrary";
import { supabase } from "../lib/supabase";

type Capture = {
  id: string;
  title: string;
  image_url?: string | null;
};

export default function ScreenshotGeneratorScreen({
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
  const [imageUrl, setImageUrl] = useState<string | null>(
    capture.image_url ?? null,
  );
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<PromptMode>("functional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const openMenu = () => {
    Alert.alert("Menu", "Choose an action", [
      { text: "Cancel", style: "cancel" },
      { text: "Projects", onPress: onGoProjects },
      { text: "Sign Out", style: "destructive", onPress: onSignOut },
    ]);
  };

  const loadCapture = async () => {
    const { data, error } = await supabase
      .from("captures")
      .select("image_url")
      .eq("id", capture.id)
      .single();

    if (!error) setImageUrl(data?.image_url ?? null);
  };

  useEffect(() => {
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

  const applyTemplate = (template: PromptTemplate) => {
    setSelectedTemplateId(template.id);
    setCustomPrompt(template.text);
  };

  const clearTemplate = () => {
    setSelectedTemplateId("");
    setCustomPrompt("");
  };

  const uploadImageFromUri = async (uri: string, mimeType?: string | null) => {
    try {
      setUploading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setUploading(false);
        return Alert.alert("Auth error", "Please sign in again.");
      }

      const response = await fetch(uri);
      const blob = await response.blob();

      const extension = uri.split(".").pop() || "jpg";
      const filePath = `${user.id}/${capture.id}_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(filePath, blob, {
          contentType: mimeType || "image/jpeg",
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

      if (updateError) return Alert.alert("Save failed", updateError.message);

      setImageUrl(publicUrl);
      Alert.alert("Success", "Screenshot uploaded successfully.");
    } catch (e: any) {
      setUploading(false);
      Alert.alert("Upload error", e?.message ?? "Unknown error");
    }
  };

  const pickGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert(
        "Permission needed",
        "Please allow photo library access.",
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    await uploadImageFromUri(asset.uri, asset.mimeType);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert("Permission needed", "Please allow camera access.");
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      cameraType: ImagePicker.CameraType.back,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    await uploadImageFromUri(asset.uri, asset.mimeType);
  };

  const showOptions = () => {
    Alert.alert("Add Screenshot", "Choose an option", [
      { text: "Cancel", style: "cancel" },
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickGallery },
    ]);
  };

  const generate = async () => {
    if (!imageUrl) {
      return Alert.alert(
        "No screenshot",
        "Please upload or capture a screenshot first.",
      );
    }

    try {
      setGenerating(true);
      const res = await generateFromScreenshotAI({
        capture_title: capture.title,
        image_url: imageUrl,
        requirement_text: "",
        prompt_mode: mode,
        custom_prompt: customPrompt,
      });

      const latestId = await getLatestTestcaseId();
      if (!latestId) {
        setGenerating(false);
        return;
      }

      const { error } = await supabase
        .from("testcases")
        .update({ content: res.content })
        .eq("id", latestId);

      setGenerating(false);

      if (error) return Alert.alert("Save failed", error.message);

      setPreview(res.content);
      Alert.alert("Generated ✅", "Screenshot-based testcase created.");
    } catch (e: any) {
      setGenerating(false);
      Alert.alert("Generation failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        showBack
        onBack={onBack}
        onMenuPress={openMenu}
        title="Screenshot Generator"
        subtitle={capture.title}
      />

      <Pressable style={styles.secondaryBtn} onPress={showOptions}>
        <Text style={styles.secondaryText}>
          {uploading ? "Uploading..." : "Add Screenshot"}
        </Text>
      </Pressable>

      {imageUrl ? (
        <View style={styles.imageBox}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={styles.emptyImageBox}>
          <Text style={styles.emptyText}>No screenshot uploaded yet.</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Prompt Mode</Text>
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
        placeholder="Example: Focus on visible validations, security checks, or automation-ready output"
        value={customPrompt}
        onChangeText={setCustomPrompt}
      />

      <Pressable style={styles.primaryBtn} onPress={generate}>
        <Text style={styles.primaryText}>
          {generating
            ? "Generating from Screenshot..."
            : "Generate from Screenshot"}
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
    marginTop: 12,
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
  },
  secondaryText: {
    color: "#0A84FF",
    fontWeight: "800",
    fontSize: 15,
  },
  imageBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 14,
    height: 240,
    backgroundColor: "#FFFFFF",
  },
  emptyImageBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    marginTop: 14,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  emptyText: {
    color: "#6B7280",
  },
  image: {
    width: "100%",
    height: "100%",
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
