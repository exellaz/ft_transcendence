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

type ServerMessage = OnlineFriendsListMsg | FriendStatusMsg;

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

  const friendIds: number[] = [6, 8]; // ! Example friend IDs

  const [friendStatusMap, setFriendStatusMap] = useState<Map<number, boolean>>(
    () => new Map(friendIds.map((id) => [id, false])),
  );

  const wsRef = useRef<WebSocket | null>(null); // TODO: what is this for?

  // -------------------------
  // Establish WebSocket connection
  // -------------------------
  const { isAuthenticated, token } = useUser();
  
  useEffect(() => {
    if (isAuthenticated === false)
      return;

    const ws = new WebSocket(`ws://localhost:3000/online-status?token=${token}`);
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
  }, [token]); // TODO: add token to dependency array if needed

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
