import { useRouter } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

import LogoutButton from "@/components/auth/LogoutButton";
import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";
import { useAuthContext } from "@/hooks/use-auth-context";

export default function HomeIndexScreen() {
  const { claims } = useAuthContext();
  const router = useRouter();
  const email =
    typeof claims?.email === "string" ? claims.email : "Unknown email";

  return (
    <Screen
      title="You are signed in"
      subtitle="This protected home screen validates session restore, tab navigation, and sign-out behavior."
      footer={<LogoutButton />}
    >
      <View style={styles.content}>
        <View style={styles.block}>
          <ThemedText type="subtitle">Current user email</ThemedText>
          <ThemedText>{email}</ThemedText>
        </View>
        <View style={styles.linkList}>
          <Button
            title="View recommendations"
            onPress={() => {
              router.push("./recommendations");
            }}
          />
          <Button
            title="Open style chat"
            onPress={() => {
              router.push("./chat");
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  block: {
    gap: 8,
  },
  linkList: {
    gap: 12,
  },
});
