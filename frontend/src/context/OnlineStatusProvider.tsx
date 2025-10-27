"use client"

// src/context/OnlineStatusContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  type ReactNode,
} from "react";
import { useUser } from "../context/UserProvider";
import { useApiQuery } from "@/hooks/useApi";
import { getAcceptedFriendshipsByUserId } from "@/lib/friendsApiClient";
import type { UserWithFriendshipId } from "@/types/friendsApi";

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

type ServerMessage = OnlineFriendsListMsg | FriendStatusMsg | FriendshipUpdateMsg;

// -------------------------
// Context value interface
// -------------------------
interface OnlineStatusContextType {
  friendStatusMap: Map<number, boolean>;
  isFriendOnline: (friendId: number) => boolean;
}

// -------------------------
// Create context
// -------------------------
const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

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

  const userId = user?.id ?? 0;

  // API query for friends list
  const {
    data: friends,
    refetch: refetchFriends,
  } = useApiQuery<UserWithFriendshipId[]>(
    () => getAcceptedFriendshipsByUserId({ userId: userId }),
    [userId],
    userId !== 0,
  );

  let friendIds: number[] = [];
  if (friends)
    friendIds = friends.map(friend => friend.id);
  console.log("FRIENDS IDS:", friendIds); // logs


  const [friendStatusMap, setFriendStatusMap] = useState<Map<number, boolean>>(
    () => new Map(friendIds.map((id) => [id, false])),
  );

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
    friendIds = friends.map(friend => friend.id);
  }, [friends]);

  const wsRef = useRef<WebSocket | null>(null); 

  // -------------------------
  // Establish WebSocket connection
  // -------------------------
  
  useEffect(() => {
    if (isAuthenticated === false)
      return;

    // const ws = new WebSocket(`ws://localhost:3000/online-status?token=${token}`);
    const ws = new WebSocket(`ws://localhost:3000/online-status`,[token || ""]);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to online-status WebSocket");
    }; 

    ws.onmessage = (event) => {
      const data: ServerMessage = JSON.parse(event.data);
      console.log("📩 Received:", data);

      switch (data.type) {
        case "ONLINE_FRIENDS_LIST":
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            data.onlineFriends.forEach((fid) => updated.set(fid, true));
            console.log("🔄 Init friendStatusMap:", updated); // logs
            return updated;
          });
          break;

        case "FRIEND_STATUS":
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            updated.set(data.friendId, data.online);
            console.log("🔄 Updated friendStatusMap:", updated); // logs
            return updated;
          });
          break;
        
        case "FRIENDSHIP_UPDATE":
          // Refetch friends list on friendship update
          refetchFriends();
          console.log("🔄 Friendship update - refetched friends and updated map");
          break;

        default:
          console.warn("⚠️ Unknown message type:", data);
      }
    };

    ws.onclose = () => {
      console.log("❌ Disconnected from online-status WebSocket");
    };

    ws.onerror = (err) => {
      console.error("💥 WebSocket error:", err);
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [isAuthenticated, token]); // TODO: add token to dependency array if needed

  // -------------------------
  // Helper to access a friend’s status easily
  // -------------------------
  const isFriendOnline = (friendId: number) => friendStatusMap.get(friendId) ?? false;

  return (
    <OnlineStatusContext.Provider value={{ friendStatusMap, isFriendOnline }}>
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
    throw new Error("useOnlineStatus must be used within an OnlineStatusProvider");
  }
  return context;
};
