// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

console.log(`
 _   _  _           _      _____               _  _ ______             _      _  _            
| | | || |         | |    |_   _|             (_)| || ___ \\           | |    | |(_)           
| | | || |_   __ _ | |__    | |   _ __   __ _  _ | || |_/ / _   _   __| |  __| | _   ___  ___ 
| | | || __| / _\` || '_ \\   | |  | '__| / _\` || || || ___ \\| | | | / _\` | / _\` || | / _ \\/ __|
| |_| || |_ | (_| || | | |  | |  | |   | (_| || || || |_/ /| |_| || (_| || (_| || ||  __/\\__ \\
 \\___/  \\__| \\__,_||_| |_|  \\_/  |_|    \\__,_||_||_|\\____/  \\__,_| \\__,_| \\__,_||_| \\___||___/
`);

console.log(
  "Love to code? Contact us at info@utahtrailbuddies.com and say hello!"
);

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT],
          responseType: "code",
        },
      },
    },
  },
});

// Create a client
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

