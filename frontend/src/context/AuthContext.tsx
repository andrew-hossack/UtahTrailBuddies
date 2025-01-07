// src/context/AuthContext.tsx
import { createContext, useContext, ReactNode } from "react";
import { useAuth as useAmplifyAuth } from "../hooks/useAuth";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    profilePhotoUrl?: string;
    isEmailVerified: boolean;
    isAdminApproved: boolean;
  } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAmplifyAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Add the provider to App.tsx
// const App = () => {
//   return (
//     <AuthProvider>
//       <QueryClientProvider client={queryClient}>
//         <BrowserRouter>
//           {/* ... rest of the app */}
//         </BrowserRouter>
//       </QueryClientProvider>
//     </AuthProvider>
//   );
// };
