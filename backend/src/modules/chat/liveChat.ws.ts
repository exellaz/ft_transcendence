import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";

export const chatRooms = new Map();

export default async function liveChatRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/ws-chat",
    { websocket: true },
    (socket: WebSocket, req: FastifyRequest) => {
      // Step 1: get client query param
      const { room } = req.query as { room?: string };
      // console.log("Chat WebSocket connection request for room:", room); //// debug

      //if no room then close socket
      if (!room) {
        socket.close();
        return;
      }

      // Step 1: asign key (room id) and value (set of clients) to map if not room exist yet
      if (!chatRooms.has(room)) {
        chatRooms.set(room, new Set());
      }
      const clients = chatRooms.get(room);
      clients.add(socket);

      // Step 2: handle incoming messages from clients
      socket.on("message", (raw: WebSocket.Data) => {
        // console.log("Chat WebSocket received:", raw.toString()); //// debug
        try {
          let msg;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            socket.close(1003, "Invalid JSON");
            return;
          }

          // --- validation ---
          if (typeof msg !== "object" || msg === null) {
            socket.close(1003, "Invalid message format");
            return;
          }
          if (typeof msg.type !== "string") {
            socket.close(1003, "Invalid message: missing type");
            return;
          }

          // --- allow type ---
          const allowedTypes = ["chat", "system"];
          if (!allowedTypes.includes(msg.type)) {
            socket.close(1003, `unsupported message type ${msg.type}`);
            return;
          }

          // --- handle message ---
          if (msg.type === "chat") {
            if (
              typeof msg.text !== "string" ||
              msg.text === undefined ||
              msg.text === null
            ) {
              socket.close(1003, "Invalid chat message: [text]");
              return;
            }
            if (
              typeof msg.from !== "string" ||
              msg.from === undefined ||
              msg.from === null
            ) {
              socket.close(1003, "Invalid chat sender: [from]");
              return;
            }
            const chatMsg = {
              type: "chat",
              id: msg.uid, //client id from client
              from: msg.from, //client id from client
              text: msg.text, //text from client
              time: Date.now(),
            };
            //broadcast to all clients in the room
            for (const client of clients) {
              if (client.readyState === WebSocket.OPEN)
                client.send(JSON.stringify(chatMsg));
            }
          }
          if (msg.type === "system") {
            if (
              typeof msg.text !== "string" ||
              msg.text === undefined ||
              msg.text === null
            ) {
              socket.close(1003, "Invalid system message: [text]");
              return;
            }
            const systemMsg = {
              type: "chat",
              id: "system", //client id from client
              from: "System",
              text: msg.text, //text from client
              time: Date.now(),
            };
            for (const client of clients) {
              if (client.readyState === WebSocket.OPEN)
                client.send(JSON.stringify(systemMsg));
            }
          }
        } catch (err) {
          console.error("unexpected error in chat ws message handling:", err);
          socket.close(1011, "server error");
        }
        // console.log("Chat WebSocket sent:", raw.toString()); //// debug
      });

      // Step 3: handle client disconnect
      socket.on("close", (code, reason) => {
        console.log(
          `[live chat websocket] Connection closed: code=${code}, reason=${reason}`,
        ); ////debug
        clients.delete(socket);
        if (clients.size === 0) {
          chatRooms.delete(room); //delete the room chat
        }
      });
    },
  );
}
