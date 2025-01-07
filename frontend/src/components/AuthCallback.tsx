import React, { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) {
      // User is authenticated, redirect to home or dashboard
      navigate("/");
    } else if (auth.error) {
      // Handle authentication errors
      console.error("Auth error:", auth.error);
      navigate("/error", {
        state: {
          error: auth.error.message,
        },
      });
    }
  }, [auth.isAuthenticated, auth.error, navigate]);

  // Show loading state while processing the callback
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-semibold text-gray-700">
            Processing login...
          </h2>
          <p className="text-gray-500">
            Please wait while we complete your authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
