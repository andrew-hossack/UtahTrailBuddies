// src/types/index.ts

export type Difficulty = "easy" | "moderate" | "difficult";

export type CategoryName =
  | "Day Hike"
  | "Backpacking"
  | "Overnight"
  | "Climbing"
  | "Swimming"
  | "Trail Run"
  | "Run"
  | "Mountain Bike";

export interface Category {
  name: CategoryName;
  difficulty: Difficulty;
}

export interface Event {
  eventId: string;
  organizerId: string;
  title: string;
  description: string;
  categories: Category[];
  headerImageUrl?: string;
  location: string;
  eventDate: string; // ISO string
  eventTime: string; // ISO string
  maxParticipants?: number;
  status: "active" | "cancelled" | "completed";
  searchField?: string; // Concatenated title and description for search
  dateCreated: string;
  lastUpdated: string;
}

export interface User {
  userId: string;
  email: string;
  name: string;
  profilePhotoUrl?: string;
  isEmailVerified: boolean;
  isAdminApproved: boolean;
  dateCreated: string;
  lastUpdated: string;
}

export interface EventParticipant {
  eventId: string;
  userId: string;
  registrationDate: string;
  status: "registered" | "cancelled";
}

export interface APIResponse<T> {
  statusCode: number;
  body: string; // Stringified JSON containing data of type T
  headers: {
    "Content-Type": "application/json";
    "Access-Control-Allow-Origin": "*";
    "Access-Control-Allow-Credentials": true;
  };
}
