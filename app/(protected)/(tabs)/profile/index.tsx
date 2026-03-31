import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function ProfileIndexScreen() {
  return (
    <PlaceholderFlowScreen
      title="Profile"
      description="This screen will show the user's account summary, preferences, and settings entry points."
      links={[
        { href: "./preferences", label: "Open preferences" },
        { href: "./settings", label: "Open settings" },
      ]}
    />
  );
}
