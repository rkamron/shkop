import { AuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase";
import { PropsWithChildren, useEffect, useState } from "react";

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>();
  const [profile, setProfile] = useState<any>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  useEffect(() => {
    const syncAuthState = async () => {
      setIsLoading(true);

      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();

      if (claimsError) {
        console.error("Error fetching claims:", claimsError);
      }

      const nextClaims = claimsData?.claims ?? null;
      setClaims(nextClaims);

      if (!nextClaims?.sub) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", nextClaims.sub)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      setProfile(profileData ?? null);
      setIsLoading(false);
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncAuthState();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setIsAuthActionLoading(false);
      return;
    }

    setIsAuthActionLoading(false);
  };

  const signUpWithPassword = async (email: string, password: string) => {
    setIsAuthActionLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      setIsAuthActionLoading(false);
      return;
    }

    setIsAuthActionLoading(false);
  };

  const signOut = async () => {
    setIsAuthActionLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    }

    setIsAuthActionLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        profile,
        authError,
        isAuthActionLoading,
        isLoggedIn: claims !== null && claims !== undefined,
        signInWithPassword,
        signUpWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
