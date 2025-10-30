import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // automatically refetch queries after user switches tabs or window.
      refetchOnWindowFocus: true,
      // staleTime omitted → defaults to 0 (immediate refetch on mount/focus)
      // staleTime (ms) - how long fetched data is considered "fresh".
      // While fresh, React Query will not refetch the data automatically (e.g. on mount or window focus).
      // Used to avoid unnecessary refetches for short-lived data.
    },
  },
});
