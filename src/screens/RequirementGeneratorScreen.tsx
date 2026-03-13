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
import { generateFromRequirementAI } from "../lib/aiApi";
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

export default function RequirementGeneratorScreen({
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
  const [mode, setMode] = useState<PromptMode>("functional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);

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

  const saveGeneratedContent = async (content: string) => {
    const latestId = await getLatestTestcaseId();
    if (!latestId) return;

    const { error } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", latestId);

    if (error) return Alert.alert("Save failed", error.message);

    setPreview(content);
  };

  const applyTemplate = (template: PromptTemplate) => {
    setSelectedTemplateId(template.id);
    setCustomPrompt(template.text);
  };

  const clearTemplate = () => {
    setSelectedTemplateId("");
    setCustomPrompt("");
  };

  const generate = async () => {
    if (!requirementText.trim()) {
      return Alert.alert("Missing requirement", "Please enter requirement.");
    }

    try {
      setGenerating(true);

      const res = await generateFromRequirementAI({
        capture_title: capture.title,
        requirement_text: requirementText,
        prompt_mode: mode,
        custom_prompt: customPrompt,
      });

      setGenerating(false);
      await saveGeneratedContent(res.content);

      Alert.alert("Generated", "AI testcase created.");
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
        title="Requirement Generator"
        subtitle={capture.title}
      />

      <Text style={styles.sectionTitle}>Requirement Input</Text>
      <TextInput
        style={styles.input}
        multiline
        textAlignVertical="top"
        placeholder="Paste requirement here..."
        value={requirementText}
        onChangeText={setRequirementText}
      />

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
        placeholder="Example: Focus on fraud validation, banking rules, or concise automation steps"
        value={customPrompt}
        onChangeText={setCustomPrompt}
      />

      <Pressable style={styles.primaryBtn} onPress={generate}>
        <Text style={styles.primaryText}>
          {generating ? "Generating..." : "Generate Testcase"}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        Generated Output
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
    color: "#111827",
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "white",
  },
  inputSmall: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "white",
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
  primaryBtn: {
    backgroundColor: "#0A84FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "white",
    flex: 1,
  },
  previewText: {
    color: "#374151",
    lineHeight: 20,
  },
});
