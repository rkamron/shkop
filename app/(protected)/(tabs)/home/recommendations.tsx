import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function HomeRecommendationsScreen() {
  return (
    <PlaceholderFlowScreen
      title="Home Recommendations"
      description="This screen will show personalized daily outfit and closet recommendations."
      links={[
        { href: "../outfits", label: "Save placeholder and open outfits" },
        { href: "../home", label: "Back to home" },
      ]}
    />
  );
}
