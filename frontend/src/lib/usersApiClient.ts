import type {
  GetUserRequest,
  GetUserResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetUserSettingsRequest,
  GetUserSettingsResponse,
  UpdateUserSettingsRequest,
  UpdateUserSettingsResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateUserAvatarRequest,
  UpdateUserAvatarResponse,
} from "../types/usersApi";

const VITE_API_URL = import.meta.env.VITE_API_URL;

// POST /auth/register
export async function register(
  payload: RegisterRequest,
): Promise<RegisterResponse> {
  const res = await fetch(`${VITE_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// POST /auth/login
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${VITE_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
}

// GET /users/:id
export async function getUserById({
  id,
}: GetUserRequest): Promise<GetUserResponse> {
  const res = await fetch(`${VITE_API_URL}/users/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  return res.json();
}

// PATCH /users/:id
export async function updateUserById(
  payload: UpdateUserRequest,
): Promise<UpdateUserResponse> {
  const { id, ...data } = payload;
  const res = await fetch(`${VITE_API_URL}/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

// PATCH /users/:id/avatar
export async function uploadUserAvatar({
  id,
  avatarFile,
}: UpdateUserAvatarRequest): Promise<UpdateUserAvatarResponse> {
  const formData = new FormData();

  // 👇 This is required:
  // Fastify will recognize this as the uploaded file.
  formData.append("file", avatarFile);

  const res = await fetch(`${VITE_API_URL}/users/${id}/avatar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    body: formData, // browser sets correct multipart headers automatically
  });

  return res.json();
}

// GET /users/:id/settings
export async function getUserSettingsById({
  id,
}: GetUserSettingsRequest): Promise<GetUserSettingsResponse> {
  const res = await fetch(`${VITE_API_URL}/users/${id}/settings`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
  });

  return res.json();
}

// PATCH /users/:id/settings
export async function updateUserSettingsById(
  payload: UpdateUserSettingsRequest,
): Promise<UpdateUserSettingsResponse> {
  const { id, ...data } = payload;
  const res = await fetch(`${VITE_API_URL}/users/${id}/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    },
    body: JSON.stringify(data),
  });

  return res.json();
}
