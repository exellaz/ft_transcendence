"use client"

// src/components/FriendStatusList.tsx
import React, { useEffect, useState, useRef } from "react";

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

const FriendStatusList: React.FC= () => {

  const currentUserId = 1; // ! Example current user ID
  const friendIds: number[] = [6, 8]; // ! Example friend IDs

  // ✅ State: Map of friendId -> online status
  const [friendStatusMap, setFriendStatusMap] = useState<Map<number, boolean>>(
    () => new Map(friendIds.map((id) => [id, false])),
  );

  const wsRef = useRef<WebSocket | null>(null);

  // -------------------------
  // Establish WebSocket connection
  // -------------------------
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/online-status?userId=${currentUserId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to online-status WebSocket");
    };

    ws.onmessage = (event) => {
      const data: ServerMessage = JSON.parse(event.data);
      console.log("Received:", data);

      switch (data.type) {
        case "ONLINE_FRIENDS_LIST":
          // Update all online friends
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            data.onlineFriends.forEach((fid) => updated.set(fid, true));
            return updated;
          });
          break;

        case "FRIEND_STATUS":
          // Update a single friend’s status
          setFriendStatusMap((prev) => {
            const updated = new Map(prev);
            updated.set(data.friendId, data.online);
            return updated;
          });
          break;

        default:
          console.warn("Unknown message type:", data);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, [currentUserId]);

  // -------------------------
  // UI rendering
  // -------------------------
  return (
    <div className="p-4 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-2">
      <h2 className="text-xl font-semibold text-gray-800">Friends</h2>
      <ul>
        {friendIds.map((id) => {
          const isOnline = friendStatusMap.get(id) ?? false;
          return (
            <li
              key={id}
              className="flex justify-between items-center border-b border-gray-200 py-2"
            >
              <span>{id}</span>
              <span
                className={`text-sm font-medium ${
                  isOnline ? "text-green-600" : "text-gray-400"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default FriendStatusList;
