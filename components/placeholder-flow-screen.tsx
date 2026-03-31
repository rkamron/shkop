import { type Href, useRouter } from "expo-router";
import { Button, StyleSheet, View } from "react-native";

import { Screen } from "@/components/ui/Screen";

type FlowLink = {
  href: Href;
  label: string;
};

type PlaceholderFlowScreenProps = {
  title: string;
  description: string;
  links?: FlowLink[];
};

export function PlaceholderFlowScreen({
  title,
  description,
  links = [],
}: PlaceholderFlowScreenProps) {
  const router = useRouter();

  return (
    <Screen title={title} subtitle={description}>
      <View style={styles.content}>
        <View style={styles.linkList}>
          {links.map((link) => (
            <Button
              key={`${title}-${link.label}`}
              title={link.label}
              onPress={() => {
                router.push(link.href);
              }}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  linkList: {
    gap: 12,
  },
});
