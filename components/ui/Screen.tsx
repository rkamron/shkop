import { type PropsWithChildren, type ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  scrollable?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
}>;

export function Screen({
  title,
  subtitle,
  scrollable = true,
  footer,
  contentStyle,
  children,
}: ScreenProps) {
  const content = (
    <View style={[styles.content, contentStyle]}>
      {title || subtitle ? (
        <View style={styles.header}>
          {title ? <ThemedText type="title">{title}</ThemedText> : null}
          {subtitle ? (
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
          ) : null}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  subtitle: {
    color: "#667085",
  },
  body: {
    gap: 16,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 8,
  },
});
