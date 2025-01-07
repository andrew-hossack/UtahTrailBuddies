import { useState, useEffect } from "react";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
} from "aws-amplify/auth";
import { useQuery } from "@tanstack/react-query";
import { signInWithRedirect } from "@aws-amplify/auth";

interface User {
  id: string;
  email: string;
  name: string;
  profilePhotoUrl?: string;
  isEmailVerified: boolean;
  isAdminApproved: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: Error | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  // Fetch user profile from our API
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) return null;
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/${authState.user.id}`
      );
      if (!response.ok) throw new Error("Failed to fetch user profile");
      return response.json();
    },
    enabled: !!authState.user?.id,
  });

  const signInWithGoogle = async () => {
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { username, userId } = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      const session = await fetchAuthSession();

      const accessToken = session.tokens?.accessToken;

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: userId || username,
          email: attributes.email || "",
          name: attributes.name || attributes.email || "",
          profilePhotoUrl: attributes.picture,
          isEmailVerified: attributes.email_verified === "true",
          isAdminApproved:
            accessToken?.payload?.["custom:isAdminApproved"] === "true",
        },
        error: null,
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error as Error,
      });
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      await signIn({ username: email, password });
      await checkAuth();
    } catch (error) {
      throw error;
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    name: string
  ) => {
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    } catch (error) {
      throw error;
    }
  };

  return {
    ...authState,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    confirmSignUp: handleConfirmSignUp,
    signInWithGoogle,
    user: userProfile || authState.user, // Prefer API profile when available
  };
};
