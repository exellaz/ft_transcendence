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
  RegisterResponse
} from "../types/api";

const API_BASE = import.meta.env.API_BASE || "http://localhost:3000";

// POST /auth/register
export async function register(
  payload: RegisterRequest
): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
};

// POST /auth/login
export async function login(
  payload: LoginRequest
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return res.json();
};

// GET /users/:id
export async function getUserById({
  id,
}: GetUserRequest): Promise<GetUserResponse> {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return res.json();
}

// PATCH /users/:id
export async function updateUserById(
  payload: UpdateUserRequest
): Promise<UpdateUserResponse> {
  const { id, ...data } = payload;
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

// GET /users/:id/settings
export async function getUserSettingsById({
  id,
}: GetUserSettingsRequest): Promise<GetUserSettingsResponse> {
  const res = await fetch(`${API_BASE}/users/${id}/settings`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return res.json();
}

// PATCH /users/:id/settings
export async function updateUserSettingsById(
  payload: UpdateUserSettingsRequest
): Promise<UpdateUserSettingsResponse> {
  const { id, ...data } = payload;
  const res = await fetch(`${API_BASE}/users/${id}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}
