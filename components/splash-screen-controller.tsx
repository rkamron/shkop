// Keeps the splash screen visible until AuthProvider finishes loading the
// session, preventing a flash of unauthenticated UI on cold start.
import { useEffect } from "react";
import { SplashScreen } from "expo-router";

import { useAuthContext } from "@/hooks/use-auth-context";

void SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return null;
}
