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

export interface LoginData {
  token: string;
  user: User;
}

// ----------------------- API ENDPOINTS -------------------------

// GET /users/:id
export interface GetUserRequest {
  id: number;
}

export interface GetUserResponse extends ApiResponse<User> {}

// PATCH /users/:id
export interface UpdateUserRequest {
  id: number; // user ID to update
  username?: string; // optional
}

export interface UpdateUserResponse extends ApiResponse<User> {}

// PATCH /users/:id/avatar  (upload user avatar)
export interface UpdateUserAvatarRequest {
  id: number; // user ID to update
  avatarFile: File; // avatar file to upload
}

export interface UpdateUserAvatarResponse extends ApiResponse<User> {}

// GET /users/:id/settings
export interface GetUserSettingsRequest {
  id: number;
}

export interface GetUserSettingsResponse extends ApiResponse<UserSettings> {}

// PATCH /users/:id/settings
export interface UpdateUserSettingsRequest {
  id: number; // user ID to update
  language?: string; // optional
}

export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {}

// POST /auth/login
export interface LoginRequest {
  identifier: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse extends ApiResponse<LoginData> {
  data: LoginData;
}

// POST /auth/register
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse extends ApiResponse<LoginData> {
  data: LoginData;
}
