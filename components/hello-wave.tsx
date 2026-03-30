import Animated from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";

export function HelloWave() {
  return (
    <Animated.View>
      <ThemedText style={{ fontSize: 28, lineHeight: 32 }}>👋</ThemedText>
    </Animated.View>
  );
}
