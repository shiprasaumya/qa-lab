import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
      <Text style={styles.logoTitle}>Verify Phone</Text>
      <Text style={styles.logoSubtitle}>
        Add an extra security step with phone-based verification.
      </Text>
    </View>
  );
}

function asString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default function VerifyPhonePage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialPhone = asString(params.phone);

  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Missing Phone", "Please enter your phone number.");
      return;
    }

    try {
      setSending(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone.trim(),
      });

      if (error) {
        Alert.alert("OTP Error", error.message);
        return;
      }

      setCodeSent(true);
      Alert.alert(
        "Code Sent",
        "A verification code has been sent to your phone.",
      );
    } catch (error: any) {
      Alert.alert(
        "OTP Error",
        error?.message || "Unable to send verification code.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!phone.trim() || !otp.trim()) {
      Alert.alert(
        "Missing Details",
        "Enter both phone number and verification code.",
      );
      return;
    }

    try {
      setVerifying(true);

      const { error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        Alert.alert("Verification Error", error.message);
        return;
      }

      Alert.alert("Phone Verified", "Your phone number has been verified.");
      router.replace("/projects");
    } catch (error: any) {
      Alert.alert(
        "Verification Error",
        error?.message || "Unable to verify code.",
      );
    } finally {
      setVerifying(false);
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
              <Ionicons
                name="phone-portrait-outline"
                size={28}
                color="#2563eb"
              />
            </View>

            <Text style={styles.cardTitle}>Two-step verification</Text>
            <Text style={styles.cardSubtitle}>
              Add your phone number and verify it with a one-time code.
            </Text>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 123 4567"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              keyboardType="phone-pad"
            />

            {codeSent && (
              <>
                <Text style={styles.fieldLabel}>Verification Code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </>
            )}

            {!codeSent ? (
              <TouchableOpacity
                style={[styles.primaryButton, sending && styles.disabledButton]}
                onPress={handleSendCode}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Send Verification Code
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    verifying && styles.disabledButton,
                  ]}
                  onPress={handleVerifyCode}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify Phone</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    sending && styles.disabledButton,
                  ]}
                  onPress={handleSendCode}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#2563eb" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Resend Code</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace("/projects")}
            >
              <Text style={styles.linkButtonText}>Skip for now</Text>
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
  cardTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#cbd5e1",
    marginBottom: 18,
    textAlign: "center",
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
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
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
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: "#60a5fa",
    fontSize: 15,
    fontWeight: "800",
  },
  linkButton: {
    alignSelf: "center",
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
