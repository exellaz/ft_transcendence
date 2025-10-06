import { WebSocketHandler } from "../../utils/webSocketHandler"
import { Game } from "./game"
import { validateConnection } from "../../utils/utils";
// import { PongGame } from "@shared/game/pong";
const wsHandler = new WebSocketHandler();

import { PongGame, GameSettings } from "../../../shared/game/pong.ts";
import { Player } from "../../../shared/game/Player.ts";

function closeSocket(socket: any, statusCode: number, errorMsg: any) {
	socket.close(1003, errorMsg)
	console.log(`🅰️ ${errorMsg}`);
	return null;
}



// todo error sometimes certain players dont show up

function compile(pongGame: PongGame, includeStaticObjects: boolean, settings = {}) {
	const state = pongGame.exportState(includeStaticObjects);

	const output = JSON.stringify({
		state: state,
		metadata: {
			timestamp: Date.now(),
			delta: pongGame.delta,
			fps: pongGame.fps,
		},
		settings: settings
	}, null, 2);

  return output;
}


/**
 * @note websocket error code: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
*/
export default async function gameWsRoute(fastify: any) {
	fastify.get("/ws-game", { websocket: true }, (socket: any, req: any) => {
		const context = validateConnection(socket, req);
		if (!context) return; // Invalid connection, already closed in validateConnection

		
		// Step 1: Assign role to client (player, spectator, etc.)
		const { clientId, roomId, room, side, playerName, playerSprite } = context;
		const player = wsHandler.assignRole(room, clientId, socket, roomId, side as string, playerName, playerSprite);



		console.log("player sprite: ", playerSprite);
		console.log("player name: ", playerName);

		console.log("room setting", room.setting.ballSpeed);

		socket.on("message", (raw: any) => {
			// console.log("Game WebSocket received:", raw.toString()); //// debug

			try {
				let msg;
				try {
					msg = JSON.parse(raw.toString());
				} catch {
					return closeSocket(socket, 1003, "Invalid JSON");
				}

				// --- validation ---
				if (typeof msg !== "object" || msg === null) 
					return closeSocket(socket, 1003, "Invalid message format");
				
				if (typeof msg.type !== "string") 
					return closeSocket(socket, 1003, "Invalid message: missing type");
				

				// --- allow type ---
				// const allowedTypes = ["move"];
				// if (!allowedTypes.includes(msg.type)) 
				// 	return closeSocket(socket, 1003, `unsupported message type ${msg.type}`);
				
				console.log(">>>> sprite :", playerSprite);

				// console.log(`recieved ${msg.type} : ${JSON.stringify(msg, null, 2)}` )

				if (msg.type === "ready") {
					console.log("player added ", clientId);
					room.game.addPlayer(new Player({
						"id": clientId,
						"name": playerName,
						"skin": 0,
						"team": side === 'left' ? 0 : 1,
						"socket": socket
					}));

					console.log("concluding handshake");
					socket.send(JSON.stringify({
						type: "ready",
						payload: {}
					}));
				}

				else if (msg.type === "fetch_world") {
					console.log("requested for full world");

					const output = compile(room.game, true, room.setting);
					console.log(`compiled ${output.length} bytes`);
					socket.send(output);
				}

				else if (msg.type === "input") {
					console.log("received move input", msg.payload);
					room.game.movePaddle(msg["payload"]["key"], clientId);
				}

			} catch (err) {
				console.error("unexpected error in game ws message handling:", err);
				closeSocket(socket, 1011, "server error");
			}
			// console.log("Game WebSocket sent:", raw.toString()); //// debug
		});





		// const game = new Game();

		// // Step 2: handle incoming messages from clients
		// socket.on("message", (raw: any) => {
		// 	// console.log("Game WebSocket received:", raw.toString()); //// debug
		// 	try {
		// 		let msg;
		// 		try {
		// 			msg = JSON.parse(raw.toString());
		// 		} catch {
		// 			socket.close(1003, "Invalid JSON");
		// 			return;
		// 		}

		// 		// --- validation ---
		// 		if (typeof msg !== "object" || msg === null) {
		// 			socket.close(1003, "Invalid message format");
		// 			return;
		// 		}
		// 		if (typeof msg.type !== "string") {
		// 			socket.close(1003, "Invalid message: missing type");
		// 			return;
		// 		}

		// 		// --- allow type ---
		// 		const allowedTypes = ["move"];
		// 		if (!allowedTypes.includes(msg.type)) {
		// 			socket.close(1003, `unsupported message type ${msg.type}`);
		// 			return;
		// 		}

		// 		// --- handle message ---
		// 		if (msg.type === "move") {
		// 			if (typeof msg.dy !== "number" || msg.dy === undefined || msg.dy === null) {
		// 				socket.close(1003, "Invalid y direction: [dy]");
		// 				return;
		// 			}
		// 			if (player.role !== "spectator") {
		// 				room.gameState.paddles[player.id!] = game.updatePaddlePosition(
		// 					room.gameState.paddles[player.id!] ?? 0,
		// 					msg.dy,
		// 					room.height,
		// 					room.setting.paddleHeight,
		// 					room.setting.paddleSpeed
		// 				);
		// 			}
		// 		}

		// 	} catch (err) {
		// 		console.error("unexpected error in game ws message handling:", err);
		// 		socket.close(1011, "server error");
		// 	}
		// 	// console.log("Game WebSocket sent:", raw.toString()); //// debug
		// });

		// Step 3: handle client disconnect
		socket.on("close", () => {
			wsHandler.handleDisconnect(socket, room, clientId, room.id);
		});
	});
}
