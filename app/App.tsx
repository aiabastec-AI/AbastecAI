import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

const extra = Constants.expoConfig?.extra ?? {};
const supabaseOk = Boolean(extra.supabaseUrl && extra.supabasePublishableKey);
const mapboxOk = Boolean(extra.mapboxAccessToken);

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AbastecAI</Text>
      <Text style={styles.subtitle}>Scaffold inicial — mapa entra no próximo passo</Text>

      <View style={styles.statusBox}>
        <StatusLine label="Supabase" ok={supabaseOk} />
        <StatusLine label="Mapbox" ok={mapboxOk} />
      </View>

      <StatusBar style="light" />
    </View>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Text style={[styles.statusLine, { color: ok ? "#2FD9C4" : "#FF7A1A" }]}>
      {ok ? "✓" : "✗"} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F12",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8A9099",
    fontSize: 14,
  },
  statusBox: {
    marginTop: 24,
    gap: 8,
  },
  statusLine: {
    fontSize: 16,
    fontWeight: "600",
  },
});
