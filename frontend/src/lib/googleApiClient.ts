import type { User } from "@/types/usersApi";

export interface GoogleLoginRequest {
  idToken: string;
  twoFactorCode?: string;
}

export interface GoogleLoginResponse {
  token: string;
  user: User;
}

export const googleLogin = async (
  params: GoogleLoginRequest,
): Promise<{
  success: boolean;
  data?: GoogleLoginResponse;
  error?: string;
  errorCode?: string;
}> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/google`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      },
    );
    const data = await response.json();
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return {
        success: false,
        error: data.error || "Google login failed",
        errorCode: data.errorCode,
      };
    }
  } catch (error) {
    console.error("Google login error:", error);
    return {
      success: false,
      error: "Network error",
    };
  }
};
