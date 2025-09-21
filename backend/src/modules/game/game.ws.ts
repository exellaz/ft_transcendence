import { WebSocketHandler } from "../../utils/webSocketHandler.ts"
import { Game } from "./game.ts"
import { validateConnection } from "../../utils/utils.ts";

const wsHandler = new WebSocketHandler();

/**
 * @note websocket error code: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
*/
export default async function gameWsRoute(fastify: any) {
	fastify.get("/ws-game", { websocket: true }, (socket: any, req: any) => {
		const context = validateConnection(socket, req);
		if (!context) return; // Invalid connection, already closed in validateConnection

		// Step 1: Assign role to client (player, spectator, etc.)
		const { clientId, roomId, room, side, playerName } = context;
		const player = wsHandler.assignRole(room, clientId, socket, roomId, side as string, playerName);
		const game = new Game();

		// Step 2: handle incoming messages from clients
		socket.on("message", (raw: any) => {
			// console.log("Game WebSocket received:", raw.toString()); //// debug
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
				const allowedTypes = ["move", "setWidth", "setHeight"];
				if (!allowedTypes.includes(msg.type)) {
					socket.close(1003, `unsupported message type ${msg.type}`);
					return;
				}

				// --- handle message ---
				if (msg.type === "move") {
					if (typeof msg.dy !== "number" || msg.dy === undefined || msg.dy === null) {
						socket.close(1003, "Invalid y direction: [dy]");
						return;
					}
					if (player.role !== "spectator") {
						room.gameState.paddles[player.id!] = game.updatePaddlePosition(
							room.gameState.paddles[player.id!] ?? 0,
							msg.dy,
							room.height,
							room.setting.paddleHeight,
							room.setting.paddleSpeed
						);
					}
				}
				if (msg.type === "setWidth") {
					if (typeof msg.width !== "number" || msg.width === undefined || msg.width === null) {
						socket.close(1003, "Invalid width: [width]");
						return;
					}
					room.width = msg.width;
				}
				if (msg.type === "setHeight") {
					if (typeof msg.height !== "number" || msg.height === undefined || msg.height === null) {
						socket.close(1003, "Invalid height: [height]");
						return;
					}
					room.height = msg.height;
				}

			} catch (err) {
				console.error("unexpected error in game ws message handling:", err);
				socket.close(1011, "server error");
			}
			// console.log("Game WebSocket sent:", raw.toString()); //// debug
		});

		// Step 3: handle client disconnect
		socket.on("close", () => {
			wsHandler.handleDisconnect(socket, room, clientId, room.id);
		});
	});
}
