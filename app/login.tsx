import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../src/lib/supabase";

type AuthMode = "signin" | "signup";

function InfinityLogo() {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.infinityOuter}>
        <View style={styles.infinityLoopLeft} />
        <View style={styles.infinityLoopRight} />
      </View>

      <Text style={styles.logoTitle}>TestMind AI</Text>
      <Text style={styles.logoSubtitle}>
        Create structured QA outputs, exploratory reviews, and export-ready test
        assets.
      </Text>
    </View>
  );
}

type SocialButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function SocialButton({ icon, label, onPress, disabled }: SocialButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.socialButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.socialIconWrap}>
        <Ionicons name={icon} size={20} color="#111827" />
      </View>
      <Text style={styles.socialButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);

  const redirectTo = useMemo(() => Linking.createURL("/login"), []);

  const canSubmit = useMemo(() => {
    if (mode === "signin") {
      return email.trim().length > 0 && password.trim().length > 0;
    }

    return (
      fullName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length >= 6 &&
      confirmPassword.trim().length > 0
    );
  }, [mode, fullName, email, password, confirmPassword]);

  const handleOAuth = async (
    provider: "google" | "apple" | "azure" | "facebook",
  ) => {
    try {
      setSocialBusy(provider);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        Alert.alert("Sign In Error", error.message);
      }
    } catch (error: any) {
      Alert.alert("Sign In Error", error?.message || "Unable to continue.");
    } finally {
      setSocialBusy(null);
    }
  };

  const handleEmailAuth = async () => {
    if (!canSubmit) {
      Alert.alert("Missing Details", "Please complete the required fields.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      Alert.alert(
        "Password Mismatch",
        "Password and confirm password must match.",
      );
      return;
    }

    try {
      setBusy(true);

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert("Sign In Error", error.message);
          return;
        }

        router.replace("/projects");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        Alert.alert("Sign Up Error", error.message);
        return;
      }

      router.push({
        pathname: "/verify-email",
        params: {
          email: email.trim(),
        },
      });
    } catch (error: any) {
      Alert.alert("Auth Error", error?.message || "Something went wrong.");
    } finally {
      setBusy(false);
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

          <View style={styles.authShell}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[
                  styles.modePill,
                  mode === "signin" && styles.modePillActive,
                ]}
                onPress={() => setMode("signin")}
              >
                <Text
                  style={[
                    styles.modePillText,
                    mode === "signin" && styles.modePillTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modePill,
                  mode === "signup" && styles.modePillActive,
                ]}
                onPress={() => setMode("signup")}
              >
                <Text
                  style={[
                    styles.modePillText,
                    mode === "signup" && styles.modePillTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>
                {mode === "signin"
                  ? "Sign in to your workspace"
                  : "Create your account"}
              </Text>

              <Text style={styles.cardSubtitle}>
                {mode === "signin"
                  ? "Access projects, generators, exploratory testing, and analytics."
                  : "Create your account with email first, then complete verification."}
              </Text>

              {mode === "signup" && (
                <>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    autoCapitalize="words"
                  />

                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Optional for now"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    keyboardType="phone-pad"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={
                  mode === "signup" ? "Minimum 6 characters" : "Enter password"
                }
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              {mode === "signup" && (
                <>
                  <Text style={styles.fieldLabel}>Confirm Password</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </>
              )}

              {mode === "signin" && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => router.push("/forgot-password")}
                >
                  <Text style={styles.linkButtonText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!canSubmit || busy) && styles.disabledButton,
                ]}
                onPress={handleEmailAuth}
                disabled={!canSubmit || busy}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === "signin" ? "Sign In" : "Create Account"}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>
                By continuing, you agree to the Terms of Service and Privacy
                Policy.
              </Text>
            </View>

            <View style={styles.separatorWrap}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>OR</Text>
              <View style={styles.separatorLine} />
            </View>

            <View style={styles.socialSection}>
              <SocialButton
                icon="logo-google"
                label={
                  socialBusy === "google"
                    ? "Connecting..."
                    : "Continue with Google"
                }
                onPress={() => handleOAuth("google")}
                disabled={!!socialBusy}
              />

              <SocialButton
                icon="logo-facebook"
                label={
                  socialBusy === "facebook"
                    ? "Connecting..."
                    : "Continue with Facebook"
                }
                onPress={() => handleOAuth("facebook")}
                disabled={!!socialBusy}
              />

              <SocialButton
                icon="logo-microsoft"
                label={
                  socialBusy === "azure"
                    ? "Connecting..."
                    : "Continue with Microsoft"
                }
                onPress={() => handleOAuth("azure")}
                disabled={!!socialBusy}
              />

              <SocialButton
                icon="logo-apple"
                label={
                  socialBusy === "apple"
                    ? "Connecting..."
                    : "Continue with Apple"
                }
                onPress={() => handleOAuth("apple")}
                disabled={!!socialBusy}
              />
            </View>
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
  authShell: {
    backgroundColor: "#111827",
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
  },
  modePill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  modePillActive: {
    backgroundColor: "#ffffff",
  },
  modePillText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#94a3b8",
  },
  modePillTextActive: {
    color: "#111827",
  },
  formCard: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cbd5e1",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 12,
  },
  linkButton: {
    alignSelf: "flex-end",
    marginBottom: 14,
  },
  linkButtonText: {
    color: "#60a5fa",
    fontSize: 14,
    fontWeight: "800",
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
  separatorWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#334155",
  },
  separatorText: {
    color: "#94a3b8",
    fontWeight: "700",
    marginHorizontal: 12,
  },
  socialSection: {
    gap: 12,
  },
  socialButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: "#181f2f",
    borderWidth: 1,
    borderColor: "#263244",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  socialIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.6,
  },
  helperText: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 20,
    color: "#94a3b8",
    textAlign: "center",
  },
});
