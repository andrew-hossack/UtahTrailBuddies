// src/pages/ProfilePage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Camera, Calendar, MapPin, Loader2, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Event } from "../types";

interface UserProfile {
  name: string;
  profilePhotoUrl?: string;
}

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    name: user?.name || "",
    profilePhotoUrl: user?.profilePhotoUrl,
  });

  // Fetch user's organized events
  const { data: organizedEvents, isLoading: loadingOrganized } = useQuery({
    queryKey: ["organizedEvents", user?.id],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/organized/${user?.id}`
      );
      if (!response.ok) throw new Error("Failed to fetch organized events");
      return response.json();
    },
  });

  // Fetch user's participating events
  const { data: participatingEvents, isLoading: loadingParticipating } =
    useQuery({
      queryKey: ["participatingEvents", user?.id],
      queryFn: async () => {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/events/participating/${user?.id}`
        );
        if (!response.ok)
          throw new Error("Failed to fetch participating events");
        return response.json();
      },
    });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: UserProfile) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/users/${user?.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setIsEditing(false);
    },
  });

  // Handle profile photo upload
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("File size must be less than 5MB");
      return;
    }

    try {
      // Get pre-signed URL
      const urlResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/upload-url?fileName=profile/${
          user?.id
        }`
      );
      const { url, key } = await urlResponse.json();

      // Upload to S3
      await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Update profile with new photo URL
      const photoUrl = `${import.meta.env.VITE_CDN_URL}/${key}`;
      setProfileData((prev) => ({ ...prev, profilePhotoUrl: photoUrl }));
      updateProfileMutation.mutate({
        ...profileData,
        profilePhotoUrl: photoUrl,
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo");
    }
  };

  const EventList = ({ events, title }: { events: Event[]; title: string }) => (
    <div>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {events.length === 0 ? (
        <p className="text-gray-500">No events found</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.eventId}
              className="bg-white rounded-lg shadow-sm p-4 flex gap-4"
            >
              {event.headerImageUrl && (
                <img
                  src={event.headerImageUrl}
                  alt={event.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{event.title}</h4>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    {format(new Date(event.eventDate), "MMMM d, yyyy")} at{" "}
                    {event.eventTime}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    {event.location}
                  </div>
                </div>
                {event.status === "cancelled" && (
                  <span className="mt-2 inline-block px-2 py-1 text-xs text-red-700 bg-red-100 rounded">
                    Cancelled
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                {profileData.profilePhotoUrl ? (
                  <img
                    src={profileData.profilePhotoUrl}
                    alt={profileData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-4 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-sm cursor-pointer">
                <Camera size={16} className="text-gray-600" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
            <div>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="text-xl font-bold px-2 py-1 border rounded"
                />
              ) : (
                <h2 className="text-xl font-bold">{profileData.name}</h2>
              )}
              <p className="text-gray-600 mt-1">{user?.email}</p>
              {user?.isAdminApproved && (
                <span className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <Check size={12} className="mr-1" />
                  Admin Approved
                </span>
              )}
            </div>
          </div>
          <div>
            {isEditing ? (
              <div className="space-x-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateProfileMutation.mutate(profileData)}
                  disabled={updateProfileMutation.isPending}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="animate-spin h-4 w-4" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Sections */}
      <div className="space-y-8">
        {/* Organized Events */}
        {loadingOrganized ? (
          <div className="text-center py-4">
            <Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-400" />
          </div>
        ) : (
          <EventList
            events={organizedEvents || []}
            title="Events You're Organizing"
          />
        )}

        {/* Participating Events */}
        {loadingParticipating ? (
          <div className="text-center py-4">
            <Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-400" />
          </div>
        ) : (
          <EventList
            events={participatingEvents || []}
            title="Events You're Attending"
          />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
