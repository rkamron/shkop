import { useLocalSearchParams } from "expo-router";

import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function OutfitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderFlowScreen
      title="Outfit Details"
      description={`This screen will show the full composition and metadata for outfit "${id ?? "unknown"}".`}
      links={[
        { href: "./recommendations", label: "See outfit recommendations" },
        { href: "../outfits", label: "Back to outfits" },
      ]}
    />
  );
}
