import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// src/components/Layout.tsx
export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-xl font-bold text-gray-800">
                  Utah Hiking Events
                </span>
              </Link>
            </div>

            <div className="flex items-center">
              <Link
                to="/events/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create Event
              </Link>

              <div className="ml-4 relative">
                <div className="flex items-center">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center"
                  >
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user?.profilePhotoUrl || "/default-avatar.png"}
                      alt=""
                    />
                    <span className="ml-2 text-gray-700">{user?.name}</span>
                  </button>
                </div>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={signOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
