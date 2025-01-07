// src/pages/LoginPage.tsx
import { useState } from "react";
import { useAuth } from "react-oidc-context";
import GoogleSignInButton from "../components/GoogleSignInButton";

const LoginPage = () => {
  const auth = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleGoogleSignIn = async () => {
    setError(undefined);
    setIsGoogleLoading(true);
    try {
      await auth.signinRedirect();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with Google"
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <div className="mt-8">
          <GoogleSignInButton
            onClick={handleGoogleSignIn}
            isLoading={isGoogleLoading}
          />
        </div>
      </div>
    </div>
  );
};

export { LoginPage };
