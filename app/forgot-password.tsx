import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
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
import { supabase } from "../src/lib/supabase";

function InfinityLogo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.infinityOuter}>
        <View style={styles.infinityLoopLeft} />
        <View style={styles.infinityLoopRight} />
      </View>
      <Text style={styles.logoTitle}>Reset Password</Text>
      <Text style={styles.logoSubtitle}>
        Enter your email and we will send a secure password reset link.
      </Text>
    </View>
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = Linking.createURL("/reset-password");

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        },
      );

      if (error) {
        Alert.alert("Reset Error", error.message);
        return;
      }

      Alert.alert(
        "Email Sent",
        "Password reset link has been sent to your email.",
      );
    } catch (err: any) {
      Alert.alert("Reset Error", err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
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
          showsVerticalScrollIndicator={false}
        >
          <InfinityLogo />

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-open-outline" size={28} color="#2563eb" />
            </View>

            <Text style={styles.heading}>Forgot your password?</Text>
            <Text style={styles.subheading}>
              No problem. Enter the email connected to your TestMind AI account.
            </Text>

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/login")}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
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
    backgroundColor: "#0b1020",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  infinityOuter: {
    width: 130,
    height: 72,
    position: "relative",
    marginBottom: 12,
  },
  infinityLoopLeft: {
    position: "absolute",
    left: 12,
    top: 10,
    width: 54,
    height: 38,
    borderWidth: 8,
    borderColor: "#2563eb",
    borderRadius: 28,
    transform: [{ rotate: "28deg" }],
  },
  infinityLoopRight: {
    position: "absolute",
    right: 12,
    top: 10,
    width: 54,
    height: 38,
    borderWidth: 8,
    borderColor: "#7c3aed",
    borderRadius: 28,
    transform: [{ rotate: "-28deg" }],
  },
  logoTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
  },
  logoSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cbd5e1",
    textAlign: "center",
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    alignSelf: "center",
  },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  subheading: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 24,
    color: "#cbd5e1",
    marginBottom: 20,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "800",
  },
});
