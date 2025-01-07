// src/pages/EventsPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Search } from "lucide-react";
import { Event, Category, Difficulty } from "../types";

interface FilterState {
  searchTerm: string;
  startDate?: string;
  endDate?: string;
  categories: Category["name"][];
  difficulties: Difficulty[];
}

const EventsPage = () => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    categories: [],
    difficulties: [],
  });

  // Fetch events with filters
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.searchTerm) params.append("searchTerm", filters.searchTerm);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.categories.length)
        params.append("categories", filters.categories.join(","));
      if (filters.difficulties.length)
        params.append("difficulties", filters.difficulties.join(","));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events?${params}`
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchTerm: e.target.value }));
  };

  const handleDateChange =
    (field: "startDate" | "endDate") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const toggleCategory = (category: Category["name"]) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const toggleDifficulty = (difficulty: Difficulty) => {
    setFilters((prev) => ({
      ...prev,
      difficulties: prev.difficulties.includes(difficulty)
        ? prev.difficulties.filter((d) => d !== difficulty)
        : [...prev.difficulties, difficulty],
    }));
  };

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={filters.searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <input
              type="date"
              className="border rounded-lg px-4 py-2"
              value={filters.startDate}
              onChange={handleDateChange("startDate")}
            />
            <input
              type="date"
              className="border rounded-lg px-4 py-2"
              value={filters.endDate}
              onChange={handleDateChange("endDate")}
            />
          </div>
        </div>

        {/* Category and Difficulty Filters */}
        <div className="flex gap-4">
          <div className="space-x-2">
            {[
              "Day Hike",
              "Backpacking",
              "Overnight",
              "Climbing",
              "Swimming",
              "Trail Run",
              "Run",
              "Mountain Bike",
            ].map((category) => (
              <button
                key={category}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.categories.includes(category as Category["name"])
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => toggleCategory(category as Category["name"])}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="space-x-2">
            {["easy", "moderate", "difficult"].map((difficulty) => (
              <button
                key={difficulty}
                className={`px-3 py-1 rounded-full text-sm ${
                  filters.difficulties.includes(difficulty as Difficulty)
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-700"
                }`}
                onClick={() => toggleDifficulty(difficulty as Difficulty)}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-500">Loading events...</span>
        </div>
      ) : !events?.length ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No events found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: Event) => (
            <Link
              key={event.eventId}
              to={`/events/${event.eventId}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              {event.headerImageUrl && (
                <div className="relative h-48 rounded-t-lg overflow-hidden">
                  <img
                    src={event.headerImageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-2" />
                    <span>
                      {format(new Date(event.eventDate), "MMMM d, yyyy")} at{" "}
                      {event.eventTime}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2" />
                    <span>{event.location}</span>
                  </div>
                  {event.maxParticipants && (
                    <div className="flex items-center">
                      <Users size={16} className="mr-2" />
                      <span>{event.maxParticipants} spots available</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.categories.map((category) => (
                    <span
                      key={`${category.name}-${category.difficulty}`}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {category.name} • {category.difficulty}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
