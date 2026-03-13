import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import LogoHeader from "../components/LogoHeader";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await signIn(email, password);

      if (error) {
        Alert.alert("Login Error", error);
        return;
      }

      router.replace("/projects");
    } catch (e: any) {
      Alert.alert("Login Error", e?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation", "Please enter email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await signUp(email, password);

      if (error) {
        Alert.alert("Create Account Error", error);
        return;
      }

      Alert.alert("Success", "Account created successfully.");
    } catch (e: any) {
      Alert.alert(
        "Create Account Error",
        e?.message || "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <LogoHeader subtitle="Generate QA tests with AI" />

          <View style={styles.card}>
            <Text style={styles.heading}>Sign in to your workspace</Text>
            <Text style={styles.subheading}>
              Manage captures, generate test cases, and build your QA dataset.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={submitting}
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? "Please wait..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCreateAccount}
              disabled={submitting}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    gap: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 22,
    padding: 20,
  },
  heading: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: "#0f172a",
  },
  subheading: {
    marginTop: 8,
    fontSize: 18,
    color: "#475569",
    marginBottom: 20,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontSize: 17,
    fontWeight: "700",
  },
});
