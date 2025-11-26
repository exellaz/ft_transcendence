"use client";

// src/context/OnlineStatusContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  type ReactNode,
} from "react";
import { useUser } from "@/context/UserProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/useApi";
import { getAcceptedFriendshipsByUserId } from "@/lib/friendsApiClient";
import type { UserWithFriendshipId } from "@/types/friendsApi";
import type { FriendChatMessage } from "@/types/friendsApi";
import { useNavigate } from "react-router-dom";

// -------------------------
// Define WebSocket message types
// -------------------------
interface OnlineFriendsListMsg {
  type: "ONLINE_FRIENDS_LIST";
  onlineFriends: number[];
}

interface FriendStatusMsg {
  type: "FRIEND_STATUS";
  friendId: number;
  online: boolean;
}

interface FriendshipUpdateMsg {
  type: "FRIENDSHIP_UPDATE";
  userId: number;
}

export interface FriendMessageMsg {
  type: "FRIEND_MESSAGE";
  username: string;
  message: FriendChatMessage;
}

interface MessageAckMsg {
  type: "MESSAGE_ACK";
  tempId: number;
  savedMessage: FriendChatMessage;
}

interface MessageErrMsg {
  type: "MESSAGE_ERR";
  friendshipId: number;
  tempId: number;
  error: string;
}

interface DuplicateLoginMsg {
  type: "DUPLICATE_LOGIN";
  message: string;
}

type ServerMessage =
  | OnlineFriendsListMsg
  | FriendStatusMsg
  | FriendshipUpdateMsg
  | FriendMessageMsg
  | MessageAckMsg
  | MessageErrMsg
  | DuplicateLoginMsg;

// -------------------------
// Context value interface
// -------------------------
interface OnlineStatusContextType {
  friendStatusMap: Map<number, boolean>;
  isFriendOnline: (friendId: number) => boolean;
  wsSendMessage: (
    tempId: number,
    friendshipId: number,
    message: string,
  ) => void;
  isDuplicateLogin: boolean;
}

// -------------------------
// Create context
// -------------------------
const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(
  undefined,
);

// -------------------------
// Provider component
// -------------------------
interface OnlineStatusProviderProps {
  // currentUserId: number;
  // friendIds: number[];
  children: ReactNode;
}

export const OnlineStatusProvider: React.FC<OnlineStatusProviderProps> = ({
  // currentUserId,
  // friendIds,
  children,
}) => {
  const { user, isAuthenticated, token } = useUser();
  const [isDuplicateLogin, setIsDuplicateLogin] = useState(false);

  const userId = user?.id ?? 0;

  const qc = useQueryClient();

  // API query for friends list
  const { data: friends, refetch: refetchFriends } = useApiQuery<
    UserWithFriendshipId[]
  >(
    () => getAcceptedFriendshipsByUserId({ userId: userId }),
    [userId],
    userId !== 0,
  );

  let friendIds: number[] = [];
  if (friends) friendIds = friends.map((friend) => friend.id);
  // console.log("FRIENDS IDS:", friendIds); // logs

  const [friendStatusMap, setFriendStatusMap] = useState<Map<number, boolean>>(
    () => new Map(friendIds.map((id) => [id, false])),
  );

  const navigate = useNavigate();

  // Rebuild the status map when friends change
  useEffect(() => {
    if (!friends || friends.length === 0) return;

    setFriendStatusMap((prev) => {
      const updated = new Map<number, boolean>();
      friends.forEach((f) => {
        updated.set(f.id, prev.get(f.id) ?? false);
      });
      return updated;
    });
    friendIds = friends.map((friend) => friend.id);
  }, [friends]);

  const wsRef = useRef<WebSocket | null>(null);

  // -------------------------
  // Establish WebSocket connection
  // -------------------------

  useEffect(() => {
    if (isAuthenticated === false) return;

    const ws = new WebSocket(`/online-status`, [token || ""]);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(
        "[Online Status websocket] ✅ Connected to online-status WebSocket",
      );
    };

    ws.onmessage = (event) => {
      const data: ServerMessage = JSON.parse(event.data);
      console.log("[Online Status websocket] 📩 Received:", data);

      switch (data.type) {
        // Online status events
        case "ONLINE_FRIENDS_LIST":
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            data.onlineFriends.forEach((fid) => updated.set(fid, true));
            console.log(
              "[Online Status websocket] 🔄 Init friendStatusMap:",
              updated,
            ); // logs
            return updated;
          });
          break;

        case "FRIEND_STATUS":
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            updated.set(data.friendId, data.online);
            console.log(
              "[Online Status websocket] 🔄 Updated friendStatusMap:",
              updated,
            ); // logs
            return updated;
          });
          break;

        case "FRIENDSHIP_UPDATE":
          // Refetch friends list on friendship update
          refetchFriends();
          console.log(
            "[Online Status websocket] 🔄 Friendship update - refetched friends and updated map",
          );
          break;

        // Friend chat events
        case "FRIEND_MESSAGE": {
          const { message } = data;
          qc.setQueryData<FriendChatMessage[]>(
            ["friendMessages", message.friendshipId],
            // add new message to the cache
            (old = []) => [...old, message],
          );
          window.dispatchEvent(
            new CustomEvent<FriendChatMessage>("updateLastMessage", {
              detail: message,
            }),
          );
          window.dispatchEvent(
            new CustomEvent<FriendMessageMsg>("newMessage", {
              detail: data,
            }),
          );
          break;
        }
        case "MESSAGE_ACK": {
          const { tempId, savedMessage } = data;
          qc.setQueryData<FriendChatMessage[]>(
            ["friendMessages", savedMessage.friendshipId],
            // optimistic message in cache is replaced with savedMessage from server
            // .map() creates a new array
            (old = []) =>
              old.map((msg) => (msg.id === tempId ? savedMessage : msg)),
          );
          window.dispatchEvent(
            new CustomEvent<FriendChatMessage>("updateLastMessage", {
              detail: savedMessage,
            }),
          );
          break;
        }
        case "MESSAGE_ERR": {
          const { friendshipId, tempId } = data;
          qc.setQueryData<FriendChatMessage[]>(
            ["friendMessages", friendshipId],
            // client removes the optimistic message that failed to send from the cache
            // old is the current cached array
            // .filter() creates a new array
            (old = []) => old.filter((m) => m.id !== tempId),
          );
          break;
        }
        case "DUPLICATE_LOGIN":
          console.warn(
            "[Online Status websocket] Duplicate login detected:",
            data.message,
          );
          setIsDuplicateLogin(true);
          navigate("/login");
          break;

        default:
          console.warn("⚠️ Unknown message type:", data);
      }
    };

    ws.onclose = () => {
      console.log(
        "[Online Status websocket] ❌ Disconnected from online-status WebSocket",
      );
    };

    ws.onerror = (err) => {
      console.error("[Online Status websocket] 💥 WebSocket error:", err);
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [isAuthenticated, token]); // TODO: add token to dependency array if needed

  // -------------------------
  // Helper to access a friend’s status easily
  // -------------------------
  const isFriendOnline = (friendId: number) =>
    friendStatusMap.get(friendId) ?? false;

  // -------------------------
  // Helper to send a message through the websocket
  // -------------------------
  const wsSendMessage = (
    tempId: number,
    friendshipId: number,
    message: string,
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "OUTGOING_MESSAGE",
          tempId,
          friendshipId,
          message,
        }),
      );
    }
  };

  return (
    <OnlineStatusContext.Provider
      value={{
        friendStatusMap,
        isFriendOnline,
        wsSendMessage,
        isDuplicateLogin,
      }}
    >
      {children}
    </OnlineStatusContext.Provider>
  );
};

// -------------------------
// Hook for consuming the context
// -------------------------
export const useOnlineStatus = (): OnlineStatusContextType => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error(
      "useOnlineStatus must be used within an OnlineStatusProvider",
    );
  }
  return context;
};
