import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FriendChatMessage } from "../types/friendsApi";
import { getAllFriendChatMessages } from "../lib/friendsApiClient";
import { useUser } from "../context/UserProvider";

/*
  Hook responsibilities:
  - fetch messages (cached by react-query)
  - provide a sendMessage() mutation that does optimistic update into react-query cache
  (optimistic update means we update the UI immediately, before server confirms the success of the mutation. 
   if server fails, we roll back.)
  Usage:
    const { data: messages, isLoading, sendMessage } = useMessages(friendshipId, { enabled: open })
*/

export const useMessages = (friendshipId: number, enabled = true) => {
  const { user } = useUser();
  const userId = user?.id ?? 0;
  // queryKey: unique identifier for this query in the react-query cache
  const queryKey = ["friendMessages", friendshipId] as const;

  // queryClient: API to read/modify the react-query cache and control queries
  const qc = useQueryClient();

  // useQuery: fetches all previous messages and keeps them cached under queryKey
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

  // useMutation: handles sending a message to the server.
  // useMutation provides named callbacks (e.g. onMutate and onError) that React Query
  // will automatically call at the right time.
  // tempId necessary because optimistic messages have not hit the server and thus have no real id yet,
  // but React Query still needs a unique key for each message to render it in a list.
  const mutation = useMutation<
    void,
    unknown,
    { message: string; tempId: number }
  >({
    // Messaging component will send the message over the websocket.
    // No-op function. Hook is purely for caching and optimistic UI.
    mutationFn: async (_vars) => {
      return;
    },

    // onMutate: runs before the mutationFn
    // - creates the optimistic FriendChatMessage and adds it to the cache
    // which will cause the UI to update immediately
    onMutate: async ({ message, tempId }) => {
      // cancel ongoing queries for this key to avoid race conditions
      await qc.cancelQueries({ queryKey });

      // snapshot previous cache so we can roll back on error
      const previous = qc.getQueryData<FriendChatMessage[]>(queryKey) || [];

      // create an optimistic message (temporary id, current time)
      const optimistic: FriendChatMessage = {
        id: tempId, // negative temp id so it won't collide with server ids
        friendshipId,
        senderId: userId,
        message,
        timestamp: new Date(),
      };

      // append optimistic message to the cached array (preserves order)
      qc.setQueryData<FriendChatMessage[]>(queryKey, [...previous, optimistic]);

      // return context with previous value for potential rollback
      return { previous };
    },

    // onError: called if mutationFn throws an error
    // - rollback optimistic update if the mutation fails
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        qc.setQueryData<FriendChatMessage[]>(queryKey, context.previous);
      }
    },
  });

  // sendMessage triggers the entire mutation lifecycle
  const sendMessage = async (message: string) => {
    const tempId = Date.now() * -1; // negative temp id to mark optimistic entries
    // invoking mutateAsync will call mutationFn
    return mutation.mutateAsync({ message, tempId });
  };

  // expose all query state (data, isLoading, isError, etc.) plus sendMessage
  return {
    ...query,
    sendMessage,
  };
};
