import type { PropsWithChildren, ReactElement } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";

import { ThemedView } from "@/components/themed-view";

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedView
        style={[
          styles.header,
          {
            backgroundColor: headerBackgroundColor.light,
          } satisfies ViewStyle,
        ]}
        darkColor={headerBackgroundColor.dark}
        lightColor={headerBackgroundColor.light}
      >
        {headerImage}
      </ThemedView>
      <ThemedView style={styles.body}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  header: {
    height: 250,
    overflow: "hidden",
  },
  body: {
    flex: 1,
    padding: 32,
    gap: 16,
  },
});
