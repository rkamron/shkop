import { Button } from "react-native";

import { useAuthContext } from "@/hooks/use-auth-context";

export default function LogoutButton() {
  const { isAuthActionLoading, signOut } = useAuthContext();

  return (
    <Button
      title={isAuthActionLoading ? "Signing out..." : "Sign out"}
      disabled={isAuthActionLoading}
      onPress={() => {
        void signOut();
      }}
    />
  );
}
