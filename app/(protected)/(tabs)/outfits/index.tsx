import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function OutfitsIndexScreen() {
  return (
    <PlaceholderFlowScreen
      title="Outfits"
      description="This screen will list saved outfits and suggested combinations."
      links={[
        { href: "./recommendations", label: "View recommendations" },
        { href: { pathname: "./[id]", params: { id: "1" } }, label: "Open outfit 1" },
      ]}
    />
  );
}
