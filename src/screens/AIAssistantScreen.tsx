import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppHeaderMenu from "../components/AppHeaderMenu";

type Props = {
  route: any;
  navigation: any;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export default function AIAssistantScreen({ route, navigation }: Props) {
  const { project } = route.params || {};

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "m1",
      role: "assistant",
      text: "Welcome to TestMind Assistant. This starter screen helps you shape QA prompts quickly. In the next phase, this will become a real in-app AI chat workflow.",
    },
  ]);

  const suggestions = useMemo(
    () => [
      "Generate login API test scenarios",
      "Create edge cases for forgot password flow",
      "Suggest bug risks for checkout feature",
      "Create coverage checklist for user profile update",
    ],
    [],
  );

  const sendMessage = () => {
    const trimmed = input.trim();

    if (!trimmed) {
      Alert.alert("Validation", "Type a question or tap a prompt suggestion.");
      return;
    }

    const userMessage: AssistantMessage = {
      id: `${Date.now()}_user`,
      role: "user",
      text: trimmed,
    };

    const assistantReply: AssistantMessage = {
      id: `${Date.now()}_assistant`,
      role: "assistant",
      text: "Assistant starter response: this screen is ready for launch planning and UX validation. In the next phase, we will connect it to your backend generator routes and project context.",
    };

    setMessages((prev) => [...prev, userMessage, assistantReply]);
    setInput("");
  };

  const applySuggestion = (value: string) => {
    setInput(value);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="AI Assistant"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>TestMind Assistant</Text>
          <Text style={styles.heroSubtitle}>
            Project: {project?.name || "Project"}
          </Text>
          <Text style={styles.heroText}>
            This starter assistant gives you a launch-ready shell for the future
            AI chat experience inside the app.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Prompt Suggestions</Text>

          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item}_${index}`}
              style={styles.suggestionCard}
              onPress={() => applySuggestion(item)}
            >
              <Ionicons name="sparkles-outline" size={18} color="#2563eb" />
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Conversation</Text>

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageCard,
                message.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage,
              ]}
            >
              <Text style={styles.messageRole}>
                {message.role === "user" ? "You" : "Assistant"}
              </Text>
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ask Assistant</Text>

          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask for QA ideas, risk analysis, coverage, or test scenarios..."
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.input}
          />

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send-outline" size={18} color="#ffffff" />
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef2f5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  heroSubtitle: {
    marginTop: 6,
    color: "#93c5fd",
    fontSize: 14,
    fontWeight: "700",
  },
  heroText: {
    marginTop: 10,
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 21,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  suggestionText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#1e3a8a",
    fontWeight: "600",
  },
  messageCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
  },
  userMessage: {
    backgroundColor: "#dbeafe",
  },
  assistantMessage: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messageRole: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6b7280",
    marginBottom: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#111827",
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
  },
  sendButton: {
    marginTop: 14,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  sendButtonText: {
    marginLeft: 8,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
