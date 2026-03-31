import { PlaceholderFlowScreen } from "@/components/placeholder-flow-screen";

export default function HomeChatScreen() {
  return (
    <PlaceholderFlowScreen
      title="Home Chat"
      description="This screen will host the conversational styling assistant and follow-up prompts."
      links={[
        { href: "../home", label: "Back to home" },
        { href: "./recommendations", label: "Open recommendations" },
      ]}
    />
  );
}
