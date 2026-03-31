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
