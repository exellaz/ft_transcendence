import type { ApiResponse } from "./apiResponse";

export type UserStatus = "online" | "offline" | "ingame";

export type Language = "english" | "simplified_chinese" | "traditional_chinese";

export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  status: UserStatus;
  joinedAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
	userId: number;
	language: Language;
}

// ----------------------- API ENDPOINTS -------------------------

// POST /auth/login
export interface LoginRequest {
	username: string;
	password: string;
}

export interface LoginResponse extends ApiResponse<User> {}


// POST /users (signup)
export interface CreateUserRequest {
	username: string;
	email: string;
	password: string;
}

export interface CreateUserResponse extends ApiResponse<User> {}


// GET /users/:id
export interface GetUserRequest {
  id: number;
}

export interface GetUserResponse extends ApiResponse<User> {}


// PATCH /users/:id
export interface UpdateUserRequest {
  id: number;              // user ID to update
  username?: string;       // optional
  avatarUrl?: string;      // optional
}

export interface UpdateUserResponse extends ApiResponse<User> {}


// GET /users/:id/settings
export interface GetUserSettingsRequest {
  id: number;
}

export interface GetUserSettingsResponse extends ApiResponse<UserSettings> {}


// PATCH /users/:id/settings
export interface UpdateUserSettingsRequest {
  id: number;              // user ID to update
  language?: string;       // optional
}

export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {}
