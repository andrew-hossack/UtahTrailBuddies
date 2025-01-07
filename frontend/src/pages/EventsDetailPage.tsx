// src/pages/EventDetailPage.tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Users,
  Edit,
  Trash,
  AlertTriangle,
} from "lucide-react";
import CustomAlertDialog from "../components/CustomAlertDialog";
import { useAuth } from "react-oidc-context";

const EventDetailPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}`
      );
      if (!response.ok) throw new Error("Failed to fetch event");
      return response.json();
    },
  });

  // Fetch participants if user has joined
  const { data: participants } = useQuery({
    queryKey: ["eventParticipants", eventId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}/participants`
      );
      if (!response.ok) throw new Error("Failed to fetch participants");
      return response.json();
    },
    enabled: !!event?.participants?.includes(user?.profile.sub),
  });

  // Join event mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}/join`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to join event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["eventParticipants", eventId],
      });
    },
  });

  // Leave event mutation
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}/leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to leave event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({
        queryKey: ["eventParticipants", eventId],
      });
    },
  });

  // Cancel event mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to cancel event");
      return response.json();
    },
    onSuccess: () => {
      navigate("/events");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-gray-500">Loading event details...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event not found.</p>
      </div>
    );
  }

  const isOrganizer = event.organizerId === user?.profile.sub;
  const isAdmin = false;
  const canManageEvent = isOrganizer || isAdmin;
  const hasJoined = event.participants?.includes(user?.profile.sub);
  const isPastEvent = new Date(event.eventDate) < new Date();
  const isFull =
    event.maxParticipants &&
    event.participants?.length >= event.maxParticipants;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Event Header */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {event.headerImageUrl && (
          <div className="relative h-64 md:h-96">
            <img
              src={event.headerImageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{event.title}</h1>
              {event.status === "cancelled" && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <AlertTriangle size={16} className="mr-1" />
                  Cancelled
                </div>
              )}
            </div>
            {canManageEvent && !isPastEvent && event.status !== "cancelled" && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/events/${eventId}/edit`)}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                >
                  <Trash size={16} />
                  Cancel Event
                </button>
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="mt-6 space-y-4 text-gray-600">
            <div className="flex items-center">
              <Calendar size={20} className="mr-2" />
              <span>
                {format(new Date(event.eventDate), "MMMM d, yyyy")} at{" "}
                {event.eventTime}
              </span>
            </div>
            <div className="flex items-center">
              <MapPin size={20} className="mr-2" />
              <span>{event.location}</span>
            </div>
            {event.maxParticipants && (
              <div className="flex items-center">
                <Users size={20} className="mr-2" />
                <span>
                  {event.participants?.length || 0} / {event.maxParticipants}{" "}
                  participants
                </span>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="mt-6 flex flex-wrap gap-2">
            {event.categories.map((category: any) => (
              <span
                key={`${category.name}-${category.difficulty}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {category.name} • {category.difficulty}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <div className="prose max-w-none">
              {event.description
                .split("\n")
                .map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
            </div>
          </div>

          {/* Join/Leave Button */}
          {!isPastEvent && event.status !== "cancelled" && (
            <div className="mt-8">
              {!hasJoined ? (
                <button
                  onClick={() => joinMutation.mutate()}
                  disabled={isFull || joinMutation.isPending}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isFull ? "Event is Full" : "Join Event"}
                </button>
              ) : (
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Leave Event
                </button>
              )}
            </div>
          )}

          {/* Participants Section */}
          {hasJoined && participants && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Participants</h2>
              <div className="space-y-4">
                {participants.map((participant: any) => (
                  <div key={participant.userId} className="flex items-center">
                    <img
                      src={participant.profilePhotoUrl || "/default-avatar.png"}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <span className="font-medium">
                      {participant.name}
                      {participant.userId === event.organizerId && (
                        <span className="ml-2 text-sm text-gray-500">
                          (Organizer)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Event Dialog */}
      <CustomAlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Cancel Event"
        description="Are you sure you want to cancel this event? This action cannot be undone. All participants will be notified via email."
        confirmText="Yes, cancel event"
        cancelText="No, keep event"
        onConfirm={() => {
          cancelMutation.mutate();
          setShowDeleteConfirm(false);
        }}
        confirmClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default EventDetailPage;
