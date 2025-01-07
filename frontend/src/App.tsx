// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import EventDetailPage from "./pages/EventsDetailPage";
import EventsPage from "./pages/EventsPage";
import { LoginPage } from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import CreateEventPage from "./pages/CreateEventPage";
import HomePage from "./pages/HomePage";
import { Layout } from "./components/Layout";
import { useAuth } from "react-oidc-context";
import AuthCallback from "./components/AuthCallback";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <div>Loading...</div>;
  }

  if (auth.error) {
    return <div>Encountering error... {auth.error.message}</div>;
  }

  if (auth.isAuthenticated) {
    return <>{children}</>;
  }
  return <Navigate to="/login" />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/callback" element={<AuthCallback />} />
        <Route path="/error" element={<AuthCallback />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <HomePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Layout>
                <EventsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/:eventId"
          element={
            <ProtectedRoute>
              <Layout>
                <EventDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/events/create"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateEventPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
