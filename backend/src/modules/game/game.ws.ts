import { WebSocketHandler } from "../../utils/webSocketHandler.ts"
import { Game } from "./game.ts"
import { validateConnection } from "../../utils/utils.ts";

const wsHandler = new WebSocketHandler();

export default async function gameWsRoute(fastify: any) {
	fastify.get("/ws-game", { websocket: true }, (socket: any, req: any) => {
		const context = validateConnection(socket, req);
		if (!context) return; // Invalid connection, already closed in validateConnection

		// Step 1: Assign role to client (player, spectator, etc.)
		const { clientId, roomId, room, side } = context;
		const player = wsHandler.assignRole(room, clientId, socket, roomId, side as string);
		const game = new Game();

		// Step 2: handle incoming messages from clients
		socket.on("message", (raw: any) => {
			// console.log("Game WebSocket received:", raw.toString()); //// debug
			const msg = JSON.parse(raw.toString());
			if (msg.type === "move") {
				if (player.role !== "spectator") {
					room.gameState.paddles[player.id!] = game.updatePaddlePosition(
						room.gameState.paddles[player.id!] ?? 0,
						msg.dy,
						room.height,
						room.setting.paddleHeight
					);
				}
			}
			if (msg.type === "setWidth") {
				room.width = msg.width;
			}
			if (msg.type === "setHeight") {
				room.height = msg.height;
			}
			// console.log("Game WebSocket sent:", raw.toString()); //// debug
		});

		// Step 3: handle client disconnect
		socket.on("close", () => {
			wsHandler.handleDisconnect(socket, room, clientId, room.id);
		});
	});
}
