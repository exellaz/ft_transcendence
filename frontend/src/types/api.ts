export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  errorCode?: number;
}

export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit & { requireAuth?: boolean } = {},
): Promise<ApiResponse<T>> => {
  const { requireAuth = false, ...fetchOptions } = options;

  const requestHeaders: Record<string, string> = {};

  if (fetchOptions.body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (fetchOptions.headers) {
    const customHeaders = new Headers(fetchOptions.headers);
    customHeaders.forEach((value, key) => {
      requestHeaders[key] = value;
    });
  }

  if (requireAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      ...fetchOptions,
      headers: requestHeaders,
    });

    const data = await response.json();

    if (data.success) {
      return { success: true, data: data.data };
    } else {
      return {
        success: false,
        error: data.error || "Request failed",
        errorCode: data.errorCode,
      };
    }
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    return {
      success: false,
      error: "Network error",
    };
  }
};
