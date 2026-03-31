import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function OutfitRecommendationsScreen() {
  return (
    <PlaceholderFlowScreen
      title="Outfit Recommendations"
      description="This screen will present generated outfit suggestions based on the user's closet and context."
      links={[
        { href: { pathname: "./[id]", params: { id: "1" } }, label: "Open outfit 1" },
        { href: "../outfits", label: "Back to outfits" },
      ]}
    />
  );
}
