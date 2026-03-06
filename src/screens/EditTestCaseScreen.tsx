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
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Capture = { id: string; title: string };

export default function EditTestCaseScreen({
  capture,
  onBack,
}: {
  capture: Capture;
  onBack: () => void;
}) {
  const [testcaseId, setTestcaseId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // cursor position so "+ Add Step" inserts where you're typing
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  const loadLatest = async () => {
    const { data, error } = await supabase
      .from("testcases")
      .select("id,content,updated_at")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) return Alert.alert("Error", error.message);

    const row = data?.[0];
    if (row) {
      setTestcaseId(row.id);
      setContent(row.content ?? "");
    }
  };

  useEffect(() => {
    loadLatest();
  }, []);

  const save = async () => {
    if (!testcaseId) return;

    setSaving(true);
    const { error } = await supabase
      .from("testcases")
      .update({ content })
      .eq("id", testcaseId);
    setSaving(false);

    if (error) return Alert.alert("Save failed", error.message);

    Alert.alert("Saved", "Latest testcase saved.");
    Keyboard.dismiss();
  };

  const approveTraining = async () => {
    // 1) current user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return Alert.alert("Auth error", authErr.message);

    const userId = authData?.user?.id;
    if (!userId) return Alert.alert("Auth error", "No user session found.");

    // 2) ALWAYS fetch latest testcase from DB at click time
    const { data, error } = await supabase
      .from("testcases")
      .select("id,content,updated_at")
      .eq("capture_id", capture.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) return Alert.alert("Error", error.message);

    const latestRow = data?.[0];
    const latestContent = latestRow?.content ?? "";

    if (!latestContent.trim()) {
      return Alert.alert("Nothing to approve", "Testcase content is empty.");
    }

    // 3) Insert into training_examples dataset
    const inputText = `Capture:${capture.title}`;

    const { error: insertErr } = await supabase
      .from("training_examples")
      .insert({
        user_id: userId,
        capture_id: capture.id,
        testcase_id: latestRow.id,
        input_text: inputText,
        output_text: latestContent,
        source: "mobile",
      });

    if (insertErr) return Alert.alert("Approve failed", insertErr.message);

    Alert.alert("Approved ✅", "Saved into training dataset.");
    Keyboard.dismiss();
  };

  const getNextStepNumber = (text: string) => {
    // finds lines like "1. " "2. "
    const matches = text.match(/^\s*\d+\.\s+/gm);
    if (!matches) return 1;

    let max = 0;
    for (const m of matches) {
      const num = parseInt(m.trim(), 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
    return max + 1;
  };

  const insertAtCursor = (
    text: string,
    insert: string,
    start: number,
    end: number,
  ) => {
    const before = text.slice(0, start);
    const after = text.slice(end);
    const nextText = before + insert + after;
    const nextCursor = before.length + insert.length;
    return { nextText, nextCursor };
  };

  const addStep = () => {
    const stepNum = getNextStepNumber(content);
    const needsNewLine = content.length > 0 && !content.endsWith("\n");
    const prefix = needsNewLine ? "\n" : "";
    const insert = `${prefix}${stepNum}. `;

    const { nextText, nextCursor } = insertAtCursor(
      content,
      insert,
      selection.start,
      selection.end,
    );

    setContent(nextText);
    setSelection({ start: nextCursor, end: nextCursor });
  };

  // reliable dismiss outside input
  const dismissOnTouch = () => {
    Keyboard.dismiss();
    return false;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponder={dismissOnTouch}
        onResponderRelease={Keyboard.dismiss}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onBack();
              }}
            >
              <Text style={styles.backText}>← Back</Text>
            </Pressable>

            <Pressable onPress={Keyboard.dismiss} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>{capture.title}</Text>
          <Text style={styles.subtitle}>Edit testcase</Text>

          <View style={styles.topButtons}>
            <Pressable style={styles.stepBtn} onPress={addStep}>
              <Text style={styles.stepBtnText}>+ Add Step</Text>
            </Pressable>

            <Pressable onPress={save} disabled={saving}>
              <Text style={[styles.linkBtn, saving ? { opacity: 0.5 } : null]}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>

            <Pressable onPress={approveTraining}>
              <Text style={styles.linkBtn}>Approve Training</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.editor}
            multiline
            scrollEnabled
            textAlignVertical="top"
            placeholder={
              "Write steps here...\n\nExample:\n1. Open app\n2. Login\n3. Verify dashboard loads"
            }
            value={content}
            onChangeText={setContent}
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 80,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  backText: { fontSize: 16 },
  doneBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  doneText: { fontSize: 16, fontWeight: "700" },

  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 6, marginBottom: 12, opacity: 0.7 },

  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  stepBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  stepBtnText: { fontWeight: "700" },

  linkBtn: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
  },

  editor: {
    flex: 1,
    minHeight: 450,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
});
