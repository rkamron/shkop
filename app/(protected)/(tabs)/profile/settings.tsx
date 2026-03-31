import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function ProfileSettingsScreen() {
  return (
    <PlaceholderFlowScreen
      title="Profile Settings"
      description="This screen will contain account controls, app settings, and support actions."
      links={[
        { href: "./preferences", label: "Go to preferences" },
        { href: "../profile", label: "Back to profile" },
      ]}
    />
  );
}
