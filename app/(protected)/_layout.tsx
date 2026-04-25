// Auth guard — renders nothing while the session loads to avoid a flash, then
// redirects unauthenticated users to /login.
import { Redirect, Slot } from "expo-router";

import { useAuthContext } from "@/hooks/use-auth-context";

export default function ProtectedLayout() {
  const { isLoading, isLoggedIn } = useAuthContext();

  if (isLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return <Slot />;
}
