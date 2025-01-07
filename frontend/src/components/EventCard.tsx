// src/components/EventCard.tsx
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, MapPin, Users } from "lucide-react";
import { Event } from "../types";
import OptimizedImage from "./OptimizedImage";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  return (
    <Link
      to={`/events/${event.eventId}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      {event.headerImageUrl && (
        <div className="relative h-48 rounded-t-lg overflow-hidden">
          <OptimizedImage
            src={event.headerImageUrl}
            alt={event.title}
            size="medium"
            className="w-full h-full"
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
  );
};

export default EventCard;
