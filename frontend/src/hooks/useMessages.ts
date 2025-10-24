import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FriendChatMessage } from "../types/friendsApi";
import { getAllFriendChatMessages } from "../lib/friendsApiClient";

/*
  Hook responsibilities:
  - fetch messages (cached by react-query)
  - provide a sendMessage() mutation that does optimistic update into react-query cache
  (optimistic update means we update the UI immediately, before server confirms; if server fails, we roll back)
  Usage:
    const { data: messages, isLoading, sendMessage } = useMessages(friendshipId, { enabled: open })
*/

export const useMessages = (friendshipId: number, enabled = true) => {
  // queryKey: unique identifier for this query in the react-query cache
  const queryKey = ["friendMessages", friendshipId] as const;

  // queryClient: API to read/modify the react-query cache and control queries
  const qc = useQueryClient();

  // useQuery: fetches messages and keeps them cached under queryKey
  // options: queryKey, queryFn (the fetcher), enabled (controls auto-fetching)
  const query = useQuery<FriendChatMessage[]>({
    queryKey,
    // fetch from backend client
    queryFn: async () => {
      const res = await getAllFriendChatMessages({ friendshipId });
      if (!res.success)
        // useQuery automatically wraps your function in an internal try/catch.
        throw new Error(res.error || "Failed to fetch messages");
      return res.data || [];
    },
    enabled, // only run when component signals it's open/ready
  });

  const API_BASE = import.meta.env.API_BASE || "http://localhost:3000";

  // useMutation: handles sending a message to the server.
  const mutation = useMutation<
    FriendChatMessage,
    unknown,
    { message: string; tempId: number }
  >({
    mutationFn: async ({ message }) => {
      const resp = await fetch(
        `${API_BASE}/friendChatMessages/${friendshipId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }
      );
      const data = await resp.json();
      return data as FriendChatMessage;
    },

    // onMutate: runs before the mutationFn — used for optimistic updates
    onMutate: async ({ message, tempId }) => {
      // cancel ongoing queries for this key to avoid race conditions
      await qc.cancelQueries({ queryKey });

      // snapshot previous cache so we can roll back on error
      const previous = qc.getQueryData<FriendChatMessage[]>(queryKey) || [];

      // create an optimistic message (temporary id, current time)
      const optimistic: FriendChatMessage = {
        id: tempId, // negative temp id so it won't collide with server ids
        friendshipId,
        senderId: (qc.getQueryData(["currentUser"]) as any)?.id ?? -1, // best-effort current user id
        message,
        timestamp: new Date(),
      };

      // append optimistic message to the cached array (preserves order)
      qc.setQueryData<FriendChatMessage[]>(queryKey, [
        ...previous,
        optimistic,
      ]);

      // return context with previous value for potential rollback
      return { previous };
    },

    // onError: rollback optimistic update if the mutation fails
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        qc.setQueryData<FriendChatMessage[]>(queryKey, context.previous);
      }
    },

    // onSettled: after success or failure, revalidate to sync with server
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  // sendMessage convenience: supplies a temporary id and triggers the mutation
  const sendMessage = async (message: string) => {
    const tempId = Date.now() * -1; // negative temp id to mark optimistic entries
    return mutation.mutateAsync({ message, tempId });
  };

  // expose all query state (data, isLoading, isError, etc.) plus sendMessage
  return {
    ...query,
    sendMessage,
  };
};
