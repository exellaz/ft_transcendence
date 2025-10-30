import type { User } from "@/types/usersApi";
import { apiRequest, type ApiResponse } from "@/types/api";

export interface TwoFactorQRResponse {
  qrUri: string;
  secret: string;
}

export interface TwoFactorResponse {
  message: string;
}

export interface TwoFactorVerifyRequest {
  identifier: string;
  password: string;
  twoFactorCode: string;
}

export interface TwoFactorVerifyResponse {
  token: string;
  user: User;
}

export interface TwoFactorStatusResponse {
  twoFactorEnabled: boolean;
}

// GET /auth/two-factor/qr
export const getTwoFactorSetup = (): Promise<
  ApiResponse<TwoFactorQRResponse>
> =>
  apiRequest<TwoFactorQRResponse>("/auth/two-factor/qr", {
    method: "GET",
    requireAuth: true,
  });

// PATCH /auth/two-factor/enable
export const enableTwoFactor = (
  token: string,
): Promise<ApiResponse<TwoFactorResponse>> =>
  apiRequest<TwoFactorResponse>("/auth/two-factor/enable", {
    method: "PATCH",
    requireAuth: true,
    body: JSON.stringify({ token }),
  });

// PATCH /auth/two-factor/disable
export const disableTwoFactor = async (): Promise<
  ApiResponse<TwoFactorResponse>
> =>
  apiRequest<TwoFactorResponse>("/auth/two-factor/disable", {
    method: "PATCH",
    requireAuth: true,
  });

// GET /auth/two-factor/status
export const getTwoFactorStatus = (): Promise<
  ApiResponse<TwoFactorStatusResponse>
> =>
  apiRequest<TwoFactorStatusResponse>("/auth/two-factor/status", {
    method: "GET",
    requireAuth: true,
  });

// POST /auth/two-factor/verify
export const verifyTwoFactor = (
  params: TwoFactorVerifyRequest,
): Promise<ApiResponse<TwoFactorVerifyResponse>> =>
  apiRequest<TwoFactorVerifyResponse>("/auth/two-factor/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
