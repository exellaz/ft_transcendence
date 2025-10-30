import type { User } from "@/types/usersApi";
import { apiRequest, type ApiResponse } from "@/types/api";

export interface GoogleLoginRequest {
  idToken: string;
  twoFactorCode?: string;
}

export interface GoogleLoginResponse {
  token: string;
  user: User;
}

export const googleLogin = (
  params: GoogleLoginRequest,
): Promise<ApiResponse<GoogleLoginResponse>> =>
  apiRequest<GoogleLoginResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify(params),
  });
