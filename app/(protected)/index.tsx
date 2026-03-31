import LogoutButton from "@/components/auth/LogoutButton";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthContext } from "@/hooks/use-auth-context";
import { StyleSheet } from "react-native";

export default function HomeScreen() {
  const { claims } = useAuthContext();
  const email =
    typeof claims?.email === "string" ? claims.email : "Unknown email";

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedText type="title">You are signed in</ThemedText>
        <ThemedView style={styles.emailBlock}>
          <ThemedText type="subtitle">Current user email</ThemedText>
          <ThemedText>{email}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.buttonRow}>
          <LogoutButton />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    gap: 16,
  },
  emailBlock: {
    gap: 8,
  },
  buttonRow: {
    marginTop: 8,
  },
});
