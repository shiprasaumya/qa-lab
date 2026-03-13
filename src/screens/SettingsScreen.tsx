import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import AppHeaderMenu from "../components/AppHeaderMenu";
import { supabase } from "../lib/supabase";
import { deleteAccount } from "../services/api";

type Props = {
  navigation: any;
};

const PRIVACY_URL = "https://example.com/privacy";
const SUPPORT_URL = "https://example.com/support";

export default function SettingsScreen({ navigation }: Props) {
  const [deleting, setDeleting] = useState(false);

  const openExternal = async (url: string) => {
    await Linking.openURL(url);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and related project data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await deleteAccount();
              await supabase.auth.signOut();
              Alert.alert("Deleted", result.message, [
                {
                  text: "OK",
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "Projects" }],
                    }),
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                "Delete Error",
                error?.message || "Unable to delete account right now.",
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeaderMenu
        title="Settings"
        showBack
        onBack={() => navigation.goBack()}
        onGoProjects={() => navigation.navigate("Projects")}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Launch Readiness</Text>
          <Text style={styles.sectionText}>
            This screen gives you the in-app compliance entry points you need
            before store submission.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Legal & Support</Text>

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => openExternal(PRIVACY_URL)}
          >
            <Ionicons name="document-text-outline" size={18} color="#2563eb" />
            <Text style={styles.rowButtonText}>Open Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowButton}
            onPress={() => openExternal(SUPPORT_URL)}
          >
            <Ionicons name="help-circle-outline" size={18} color="#2563eb" />
            <Text style={styles.rowButtonText}>Open Support Page</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionText}>
            You can delete your account from inside the app.
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </>
            )}
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
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6b7280",
  },
  rowButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  rowButtonText: {
    marginLeft: 10,
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "700",
  },
  deleteButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 14,
  },
  deleteButtonText: {
    marginLeft: 8,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
