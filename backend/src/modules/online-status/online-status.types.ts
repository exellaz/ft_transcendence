import { WebSocket } from "ws";

// Attach a custom isAlive flag to this WebSocket object
export interface HeartbeatWebSocket extends WebSocket {
  isAlive: boolean;
}

export interface OutgoingMessageMsg {
  type: "OUTGOING_MESSAGE";
  tempId: number;
  friendshipId: number;
  message: string;
}

export const HEARTBEAT_INTERVAL = 10000; // 10s
