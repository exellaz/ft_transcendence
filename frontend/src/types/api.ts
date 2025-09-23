export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
	INGAME = "ingame",
}

export enum Language {
	ENGLISH = "english",
	CHINESE = "chinese",
	MALAY = "malay",
}

export enum TextSize {
	SMALL = "small",
	MEDIUM = "medium",
	LARGE = "large",
}

export enum CameraTracking {
	STATIC = "static",
	DYNAMIC = "dynamic",
}

export interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl?: string;
  usercode: string;
  status: UserStatus;
  joinedAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
	userId: number;
	language: Language;
	textSize: TextSize;
	inGameCameraTracking: CameraTracking;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
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
  id: string;              // user ID to update
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
  id: string;              // user ID to update
  language?: string;       // optional
  textSize?: string;          // optional
  inGameCameraTracking?: string;      // optional
}

export interface UpdateUserSettingsResponse extends ApiResponse<UserSettings> {}
