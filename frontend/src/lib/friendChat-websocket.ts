export type FriendChatSocketPayload = {
  type: string;
  friendshipId?: number;
  payload?: any;
};

export const createFriendChatSocket = (
  userId: number,
  onMessage: (data: any) => void
) => {
  const ws = new WebSocket(
    import.meta.env.VITE_WS_URL + `/ws-friends/${userId}`
  );

  ws.addEventListener("message", (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      onMessage(ev.data);
    }
  });

  return {
    send: (payload: FriendChatSocketPayload) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
      else console.warn("friend socket not open; message dropped");
    },
    close: () => ws.close(),
    raw: ws,
  };
};
