import { createContext, useContext } from "react";

export type AuthData = {
  claims?: Record<string, any> | null;
  profile?: any | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  authError: string | null;
  isAuthActionLoading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthData | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
};
