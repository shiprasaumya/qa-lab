import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
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
      <Text style={styles.logoTitle}>Verify Email</Text>
      <Text style={styles.logoSubtitle}>
        Confirm your email before accessing TestMind AI.
      </Text>
    </View>
  );
}

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = asString(params.email);

  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const redirectTo = useMemo(() => Linking.createURL("/login"), []);

  const handleResend = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "No email was provided for verification.");
      return;
    }

    try {
      setBusy(true);

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        Alert.alert("Resend Error", error.message);
        return;
      }

      Alert.alert(
        "Verification Sent",
        "A new verification email has been sent.",
      );
    } catch (error: any) {
      Alert.alert(
        "Resend Error",
        error?.message || "Unable to resend verification email.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setChecking(true);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        Alert.alert("Check Error", error.message);
        return;
      }

      if (user?.email_confirmed_at) {
        router.replace("/projects");
        return;
      }

      Alert.alert(
        "Not Verified Yet",
        "Your email is still not verified. Please open the email and tap the confirmation link.",
      );
    } catch (error: any) {
      Alert.alert(
        "Check Error",
        error?.message || "Unable to check verification status.",
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboard}
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

            <Text style={styles.cardTitle}>Check your inbox</Text>
            <Text style={styles.cardSubtitle}>
              We sent a verification email to:
            </Text>

            <View style={styles.emailBadge}>
              <Text style={styles.emailText}>{email || "No email found"}</Text>
            </View>

            <Text style={styles.helpText}>
              Open the email and tap the verification link. Then come back here
              and continue.
            </Text>

            <TouchableOpacity
              style={[styles.primaryButton, checking && styles.disabledButton]}
              onPress={handleCheckStatus}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  I Verified My Email
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, busy && styles.disabledButton]}
              onPress={handleResend}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Resend Verification Email
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.linkButtonText}>Back to Login</Text>
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
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
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
    alignItems: "center",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#cbd5e1",
    marginBottom: 12,
    textAlign: "center",
  },
  emailBadge: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    width: "100%",
  },
  emailText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 18,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 12,
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
    width: "100%",
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "800",
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
