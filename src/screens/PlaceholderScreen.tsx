import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

type Props = {
  route: any;
};

export default function PlaceholderScreen({ route }: Props) {
  const title = route?.params?.title || "Coming Soon";
  const projectName = route?.params?.projectName || "Project";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>
          {title} page for {projectName} will be connected next.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
});
