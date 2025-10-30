import { useState, useEffect } from "react";
import type { ApiResponse } from "../types/apiResponse";

// ========================= API QUERY HOOK =========================
// For GET requests (fetching data)
export function useApiQuery<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: React.DependencyList = [],
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // prevent premature or undefined API calls
    // e.g. userId must be set correctly before enabled is toggled true
    if (!enabled) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiCall();

        // Prevent state updates if component unmounted
        if (!isMounted) return;

        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || "API call failed");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("API query error:", err);
        setError("Network error occurred");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      // React useEffect cleanup function will be written in these braces and
      // will be called when the component unmounts.
      // Cleanup to prevent memory leaks.
      // The toggled flag will be detected by the async function so that if the
      // component is already unmounted, the function will not try to update
      // the state/data of the unmounted component.
      isMounted = false;
    };
  }, dependencies);

  const refetch = () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        const response = await apiCall();
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.error || "API call failed");
        }
      } catch (err) {
        console.error("API query refetch error:", err);
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };

  return { data, loading, error, refetch };
}

// ========================= API MUTATION HOOK =========================
// For POST/PATCH/DELETE requests (changing data)
// Simple version - no loading/error states
// No state updates = no unmounting issues
export function useApiMutation<TRequest, TResponse>(
  mutationFn: (payload: TRequest) => Promise<ApiResponse<TResponse>>,
) {
  const mutate = async (payload: TRequest) => {
    try {
      const response = await mutationFn(payload);
      return {
        success: response.success,
        data: response.data,
        error: response.error,
        errorCode: response.errorCode,
      };
    } catch {
      return {
        success: false,
        error: "Network error",
        errorCode: "NETWORK_ERROR",
      };
    }
  };

  return { mutate };
}
