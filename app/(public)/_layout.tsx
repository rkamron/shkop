import { Redirect, Slot } from "expo-router";

import { useAuthContext } from "@/hooks/use-auth-context";

export default function PublicLayout() {
  const { isLoading, isLoggedIn } = useAuthContext();

  if (isLoading) {
    return null;
  }

  if (isLoggedIn) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}
