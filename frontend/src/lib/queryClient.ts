import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime (ms) - how long fetched data is considered "fresh". 
      // While fresh, React Query will not refetch the data automatically (e.g. on mount or window focus). 
      // Use this to avoid unnecessary refetches for short-lived data.
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});
