import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Screen } from "@/components/ui/Screen";

export default function StylistIndexScreen() {
  return (
    <Screen title="Stylist" scrollable={false}>
      <View style={styles.placeholder}>
        <ThemedText type="subtitle">Stylist</ThemedText>
        <ThemedText>Coming soon.</ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
