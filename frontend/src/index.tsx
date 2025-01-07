// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "react-oidc-context";

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

// Create a client
const queryClient = new QueryClient();

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_gEFXKkZHz",
  client_id: "2fk1h395cmmu9jgvauvgueansc",
  redirect_uri: "http://localhost:3000/callback",
  response_type: "code",
  scope: "email openid profile",
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

