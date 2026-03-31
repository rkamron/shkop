import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function ProfilePreferencesScreen() {
  return (
    <PlaceholderFlowScreen
      title="Profile Preferences"
      description="This screen will manage style preferences, sizing context, and recommendation tuning."
      links={[
        { href: "./settings", label: "Go to settings" },
        { href: "../profile", label: "Back to profile" },
      ]}
    />
  );
}
