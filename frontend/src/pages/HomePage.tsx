// src/pages/HomePage.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, isFuture } from "date-fns";
import { Calendar, MapPin, ArrowRight, Plus } from "lucide-react";
import { Event } from "../types";
import OptimizedImage from "../components/OptimizedImage";
import { useAuth } from "react-oidc-context";

const HomePage = () => {
  const { user } = useAuth();

  // Fetch upcoming events
  const { data: upcomingEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ["upcomingEvents"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events?limit=4&sort=date`
      );
      if (!response.ok) throw new Error("Failed to fetch upcoming events");
      return response.json();
    },
  });

  // Fetch user's upcoming events
  const { data: userEvents, isLoading: loadingUserEvents } = useQuery({
    queryKey: ["userEvents", user?.profile.sub],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/participating/${
          user?.profile.sub
        }`
      );
      if (!response.ok) throw new Error("Failed to fetch user events");
      return response.json();
    },
    enabled: !!user?.profile.sub,
  });

  // Filter to show only future events
  const futureUserEvents = userEvents
    ?.filter((event: Event) => isFuture(new Date(event.eventDate)))
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {user?.profile.family_name?.split(" ")[0]}!
        </h1>
        <p className="text-xl text-gray-600">
          Find your next outdoor adventure in Utah.
        </p>
      </div>

      {/* User's Upcoming Events */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Your Upcoming Events
          </h2>
          <Link
            to="/events/create"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create Event
          </Link>
        </div>

        {loadingUserEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : futureUserEvents?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {futureUserEvents.map((event: Event) => (
              <Link
                key={event.eventId}
                to={`/events/${event.eventId}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                {event.headerImageUrl && (
                  <OptimizedImage
                    src={event.headerImageUrl}
                    alt={event.title}
                    size="medium"
                    className="h-32 w-full rounded-t-lg"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{event.title}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {format(new Date(event.eventDate), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2" />
                      {event.location}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven't joined any upcoming events yet.
            </p>
            <Link
              to="/events"
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
            >
              Browse Events
              <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
        )}
      </div>

      {/* Featured/Upcoming Events */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
          <Link
            to="/events"
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
          >
            View All
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>

        {loadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-48 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {upcomingEvents?.map((event: Event) => (
              <Link
                key={event.eventId}
                to={`/events/${event.eventId}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                {event.headerImageUrl && (
                  <OptimizedImage
                    src={event.headerImageUrl}
                    alt={event.title}
                    size="medium"
                    className="h-32 w-full rounded-t-lg"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{event.title}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {format(new Date(event.eventDate), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center">
                      <MapPin size={14} className="mr-2" />
                      {event.location}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.categories.map((category) => (
                      <span
                        key={`${category.name}-${category.difficulty}`}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
