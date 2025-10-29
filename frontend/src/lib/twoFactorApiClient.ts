export interface TwoFactorQRResponse {
  qrUri: string;
  secret: string;
}

export interface TwoFactorResponse {
  message: string;
}

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
});

export const getTwoFactorSetup = async (): Promise<{
  success: boolean;
  data?: TwoFactorQRResponse;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/two-factor/qr`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error("2FA setup request error:", error);
    return { success: false, error: "Network error" };
  }
};

export const enableTwoFactor = async (
  token: string,
): Promise<{
  success: boolean;
  data?: TwoFactorResponse;
  error?: string;
  code?: string;
}> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/two-factor/enable`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ token }),
      },
    );

    const data = await response.json();
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return {
        success: false,
        error: data.error,
        code: data.code,
      };
    }
  } catch (error) {
    console.error("Enable 2FA request error:", error);
    return { success: false, error: "Network error" };
  }
};

export const disableTwoFactor = async (): Promise<{
  success: boolean;
  data?: TwoFactorResponse;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/two-factor/disable`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      },
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error("2FA disable request error:", error);
    return { success: false, error: "Network error" };
  }
};

export interface TwoFactorStatusResponse {
  twoFactorEnabled: boolean;
}

// Check if user has 2FA enabled
export const getTwoFactorStatus = async (): Promise<{
  success: boolean;
  data?: TwoFactorStatusResponse;
  error?: string;
}> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/auth/two-factor/status`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      },
    );

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return {
        success: false,
        error: data.error || "Failed to get 2FA status",
      };
    }
  } catch (error) {
    console.error("2FA status request error:", error);
    return { success: false, error: "Network error" };
  }
};
