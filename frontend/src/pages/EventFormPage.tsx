// src/pages/EventFormPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Upload, X, Loader2 } from "lucide-react";
import { CategoryName, Difficulty } from "../types";
import { apiClient } from "../lib/apiClient";

const CATEGORIES: CategoryName[] = [
  "Day Hike",
  "Backpacking",
  "Overnight",
  "Climbing",
  "Swimming",
  "Trail Run",
  "Run",
  "Mountain Bike",
];

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "difficult"];

interface EventFormData {
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  maxParticipants?: number;
  categories: Array<{
    name: CategoryName;
    difficulty: Difficulty;
  }>;
  headerImage?: File;
}

const EventFormPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!eventId;

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    eventDate: "",
    eventTime: "",
    location: "",
    categories: [],
  });
  const [headerImagePreview, setHeaderImagePreview] = useState<string>();
  const [errors, setErrors] = useState<
    Partial<Record<keyof EventFormData, string>>
  >({});

  // Fetch existing event data if in edit mode
  const { data: existingEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => apiClient.get(`/v1/events/${eventId}`),
    enabled: isEditMode,
  });

  // Initialize form with existing data
  useEffect(() => {
    if (existingEvent) {
      setFormData({
        title: existingEvent.title,
        description: existingEvent.description,
        eventDate: existingEvent.eventDate.split("T")[0],
        eventTime: existingEvent.eventTime,
        location: existingEvent.location,
        maxParticipants: existingEvent.maxParticipants,
        categories: existingEvent.categories,
      });
      if (existingEvent.headerImageUrl) {
        setHeaderImagePreview(existingEvent.headerImageUrl);
      }
    }
  }, [existingEvent]);

  // Get pre-signed URL for image upload
  const getPreSignedUrl = async (fileName: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/upload-url?fileName=${fileName}`
    );
    if (!response.ok) throw new Error("Failed to get upload URL");
    return response.json();
  };

  // Upload image to S3
  const uploadImage = async (file: File, preSignedUrl: string) => {
    const response = await fetch(preSignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
    if (!response.ok) throw new Error("Failed to upload image");
  };

  // Create/Update event mutation
  const eventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      let headerImageUrl;

      if (data.headerImage) {
        const fileName = `events/${Date.now()}-${data.headerImage.name}`;
        const { url, key } = await getPreSignedUrl(fileName);
        await uploadImage(data.headerImage, url);
        headerImageUrl = `${import.meta.env.VITE_CDN_URL}/${key}`;
      }

      const eventData = {
        ...data,
        headerImageUrl: headerImageUrl || existingEvent?.headerImageUrl,
      };

      const response = await fetch(
        isEditMode
          ? `${import.meta.env.VITE_API_URL}/v1/events/${eventId}`
          : `${import.meta.env.VITE_API_URL}/v1/events`,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) throw new Error("Failed to save event");
      return response.json();
    },
    onSuccess: (data) => {
      navigate(`/events/${data.eventId}`);
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setErrors((prev) => ({
          ...prev,
          headerImage: "Image must be less than 5MB",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, headerImage: file }));
      setHeaderImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, headerImage: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.description)
      newErrors.description = "Description is required";
    if (!formData.eventDate) newErrors.eventDate = "Date is required";
    if (!formData.eventTime) newErrors.eventTime = "Time is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (formData.categories.length === 0)
      newErrors.categories = "At least one category is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    eventMutation.mutate(formData);
  };

  const toggleCategory = (category: CategoryName, difficulty: Difficulty) => {
    setFormData((prev) => {
      const exists = prev.categories.some(
        (c) => c.name === category && c.difficulty === difficulty
      );

      return {
        ...prev,
        categories: exists
          ? prev.categories.filter(
              (c) => !(c.name === category && c.difficulty === difficulty)
            )
          : [...prev.categories, { name: category, difficulty }],
      };
    });
    setErrors((prev) => ({ ...prev, categories: undefined }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? "Edit Event" : "Create New Event"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Image Upload */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Event Header Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              {headerImagePreview ? (
                <div className="relative w-full">
                  <img
                    src={headerImagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderImagePreview(undefined);
                      setFormData((prev) => ({
                        ...prev,
                        headerImage: undefined,
                      }));
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Upload an image</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
            {errors.headerImage && (
              <p className="mt-1 text-sm text-red-600">{errors.headerImage}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Event Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, title: e.target.value }));
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter event title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      eventDate: e.target.value,
                    }));
                    setErrors((prev) => ({ ...prev, eventDate: undefined }));
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full pl-10 p-2 border rounded-lg"
                />
              </div>
              {errors.eventDate && (
                <p className="mt-1 text-sm text-red-600">{errors.eventDate}</p>
              )}
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Time
              </label>
              <div className="relative">
                <Clock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      eventTime: e.target.value,
                    }));
                    setErrors((prev) => ({ ...prev, eventTime: undefined }));
                  }}
                  className="w-full pl-10 p-2 border rounded-lg"
                />
              </div>
              {errors.eventTime && (
                <p className="mt-1 text-sm text-red-600">{errors.eventTime}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Location
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }));
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }}
                className="w-full pl-10 p-2 border rounded-lg"
                placeholder="Enter meeting location"
              />
            </div>
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Max Participants */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Maximum Participants (Optional)
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxParticipants || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxParticipants: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
              }
              className="w-full p-2 border rounded-lg"
              placeholder="Leave empty for no limit"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Categories and Difficulty
            </label>
            <div className="space-y-4">
              {CATEGORIES.map((category) => (
                <div key={category} className="flex flex-wrap gap-2">
                  <span className="w-32 text-sm font-medium">{category}</span>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map((difficulty) => (
                      <button
                        type="button"
                        key={difficulty}
                        onClick={() => toggleCategory(category, difficulty)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          formData.categories.some(
                            (c) =>
                              c.name === category && c.difficulty === difficulty
                          )
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {difficulty}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.categories && (
              <p className="mt-1 text-sm text-red-600">{errors.categories}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }));
                setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={6}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter event description, including important details like what to bring"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={eventMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {eventMutation.isPending && (
                <Loader2 className="animate-spin" size={16} />
              )}
              {isEditMode ? "Update Event" : "Create Event"}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {eventMutation.error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">
              {eventMutation.error instanceof Error
                ? eventMutation.error.message
                : "Failed to save event"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventFormPage;
