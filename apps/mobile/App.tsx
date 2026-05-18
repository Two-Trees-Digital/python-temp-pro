import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, SafeAreaView } from "react-native";

// turbo-temp Welcome screen. Operators replace this with their app's
// real first surface once the mobile companion is wired up.

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>👋</Text>
        </View>
        <Text style={styles.brand}>Welcome to your app</Text>
        <Text style={styles.tagline}>
          Edit App.tsx to start building your mobile experience.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.footer}>Powered by Two Trees Digital</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#374151",
  },
  logoText: { fontSize: 44 },
  brand: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  tagline: {
    color: "#9ca3af",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  divider: {
    height: 1,
    width: 64,
    backgroundColor: "#1f2937",
    marginVertical: 32,
  },
  footer: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
