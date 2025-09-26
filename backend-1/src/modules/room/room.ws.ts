import { WebSocketHandler } from "../../utils/webSocketHandler.ts"
import { validateConnection } from "../../utils/utils.ts";

const wsHandler = new WebSocketHandler();

export default async function roomWsRoutes(fastify: any) {
	fastify.get("/ws-room", { websocket: true }, (socket: any, req: any) => {
		const context = validateConnection(socket, req);
        // console.log("Websocket connection context: ", context); //// debug
		if (!context) return; // Invalid connection, already closed in validateConnection

		// step 1: Assign role to client (player, spectator, etc.)
		const { clientId, roomId, room, side, playerName, playerSprite } = context;
		const player = wsHandler.assignRole(room, clientId, socket, roomId, side as string, playerName, playerSprite);
		//  console.log("Websocket assign role response: ", player); //// debug

		// step 2: handle incoming messages from clients
		socket.on("message", (raw: any) => {
			// console.log("WebSocket msg received:", raw.toString()); //// debug
			wsHandler.handleMsgOrEvent(socket, room, player, raw.toString());
			// console.log("WebSocket msg sent:", raw.toString()); //// debug
		});

		// Step 3: handle client disconnect
		socket.on("close", () => {
			wsHandler.handleDisconnect(socket, room, clientId, room.id);
		});
	});
}
