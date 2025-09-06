import { WebSocket } from "@fastify/websocket"
import { Game } from "./game.ts";
import { rooms, startRoomLoop, roomStartGame, roomEndGame } from "./room.ts";
import { createChatMessage } from "./chat.ts";

const game = new Game(); //create game object

/**
 * @brief Interface for WebSocketHandler class method
*/
interface IWebSocketHandler {
	assignRole(room: any, clientId: string, socket: any, roomId: string): string;
	handleMsgOrEvent(socket: any, room: any, role:string, raw:string): void;
	handleDisconnect(socket: any, room: any, clientId: string, role:string, roomId: string): void;
	broadcast(room: any, msg: any): void;
}

export class WebSocketHandler implements IWebSocketHandler {
	global: Set<WebSocket> = new Set(); // Track all active WebSocket connections

	/**
	 * @brief assign role to client (player, spectator, etc.)
	 * @param room The game room object
	 * @param clientId Unique identifier for the client
	 * @param socket The WebSocket connection for the client
	 * @param roomId The ID of the room
	 * @return The assigned role as a string
	*/
	assignRole(room: any, clientId: string, socket: any, roomId: string, preferredSide?: "left" | "right"): string {
		// Add socket to room if present
		if (socket) {
			room.sockets.set(socket, clientId);
			room.clients.add(socket);
		}

		//check if client has the role
		let role = room.clientRoles.get(clientId);

		//assign the role if not exist
		if (!role) {
			// if player request a side
			if (preferredSide === "left" && room.gameState.teams.left.length < room.teamSize) {
				role = `left_player${room.gameState.teams.left.length + 1}`;
				room.gameState.teams.left.push(role);
			}
			else if (preferredSide === "right" && room.gameState.teams.right.length < room.teamSize) {
				role = `right_player${room.gameState.teams.right.length + 1}`;
				room.gameState.teams.right.push(role);
			}
			else {
				role = "spectator";
			}

			// assign the role to the client
			room.clientRoles.set(clientId, role);

			//initialize thier position and score (prevent garbage value)
			if (role !== "spectator") {
				game.setPaddlePositionWithTeam(room);
				room.gameState.score.left = 0;
				room.gameState.score.right = 0;
			}

			if (socket) {
				// send initial state immediately
				socket.send(JSON.stringify({
					type: "state",
					gameState: room.gameState,
					isSpectator: role === "spectator",
					leaderId: room.leaderId,
					canStart: room.canStart || false
				}));

				console.log(`Player (${role}) [ ${clientId} ] joined room ${room.name} (${roomId})`);
				this.broadcast(room, createChatMessage("system", `${role} joined the game.`));
			}

			// check if room is full and start game
			const totalPlayers = room.gameState.teams.left.length + room.gameState.teams.right.length;
			if (totalPlayers === room.teamSize * 2 && !room.gameStarted) {
				roomStartGame(room);
				startRoomLoop(room);
			}
		} else {
			if (socket) {
				//if the player is reconnect
				if (room.pendingDisconnects.has(clientId)) {
					clearTimeout(room.pendingDisconnects.get(clientId)); //remove timeout
					room.pendingDisconnects.delete(clientId); //remove from pending disconnects

					// Ensure player back to his position
					if (role.startsWith("left_") && !room.gameState.teams.left.includes(role))
						room.gameState.teams.left.push(role);
					if (role.startsWith("right_") && !room.gameState.teams.right.includes(role))
						room.gameState.teams.right.push(role);

					console.log(`Player (${role}) [ ${clientId} ] reconnected as ${role} in room ${room.name} (${roomId})`);
					this.broadcast(room, createChatMessage("system", `${role} reconnect the game.`));

					this.broadcast(room, {
            		    type: "state",
            		    gameState: room.gameState,
            		    leaderId: room.leaderId,
            		    canStart: room.canStart
            		});
				}
			}
		}
		return role;
	}

	/**
	 * @brief handle incoming messages or events from clients.
	 * @param socket The WebSocket connection for the client
	 * @param room The game room object
	 * @param role The role of the client (player, spectator, etc.)
	 * @param raw The raw message string received from the client
	 * @note Handles "move", "setWidth", "setHeight", and "chat" message types
	 * @note Updates paddle positions, room dimensions, and broadcasts chat messages
	*/
	handleMsgOrEvent(socket: any, room: any, role:string, raw:string) {
		const msg = JSON.parse(raw);

		const broadcastState = (room: any) => {
			this.updateCanStart(room);
			console.log(`check can start: ${room.canStart}`); //debug
			this.broadcast(room, {
				type: "state",
				gameState: room.gameState,
				leaderId: room.leaderId,
				canStart: room.canStart || false
			});
		};

		if (msg.type === "move") {
			const dy = msg.dy;
			const paddleHeight = 80;
			if (role!.startsWith("left_player") || role!.startsWith("right_player")) {
				room.gameState.paddles[role!] = game.updatePaddlePosition(
					room.gameState.paddles[role!] ?? 0,
					dy,
					room.height,
					paddleHeight
				);
			}
		}
		else if (msg.type === "setWidth") {
			room.width = msg.width;
		}
		else if (msg.type === "setHeight") {
			room.height = msg.height;
		}
		else if (msg.type === "chat") {
			this.broadcast(room, createChatMessage(role ?? "spectator", String(msg.text)));
		}
		else if (msg.type === "switchSide") {
			const clientId = room.sockets.get(socket);
			const currentRole = room.clientRoles.get(clientId);

			//ignore if spectator or no role
			if (!currentRole || currentRole === "spectator")
				return;

			//if countdown started, cannot switch side
			if (room.gameState.countdown > 0) {
				socket.send(JSON.stringify({ type: "error", text: "Cannot switch side during countdown" }));
				console.log(`Player (${role}) fail to switch side during countdown in room ${room.name} (${room.id})`);
				return;
			}

			if (room.readyStatus.get(currentRole)) {
				socket.send(JSON.stringify({ type: "error", text: "Cannot switch side when ready. Unready first." }));
				console.log(`Player (${role}) fail to switch side when ready in room ${room.name} (${room.id})`);
				return;
			}

			//assign new role after switch side
			const newRole = this.handleSwitchSide(room, socket, msg.side as "left" | "right");
			if (newRole)
				role = newRole;

			broadcastState(room);
		}
		else if (msg.type === "ready") {
			const clientId = room.sockets.get(socket);
			const currentRole = room.clientRoles.get(clientId);

			// Ignore if spectator, no role, or leader
			if (!currentRole || currentRole === "spectator" || clientId === room.leaderId)
				return;

			//mark player as ready
			room.readyStatus.set(currentRole, msg.ready);
			this.broadcast(room, createChatMessage("system", `${currentRole} is ${msg.ready ? "ready" : "unready"}.`));
			console.log(`Player (${currentRole}) is ${msg.ready ? "ready" : "unready"} in room ${room.name} (${room.id})`);
			broadcastState(room);
		}
		else if (msg.type === "start") {
			const clientId = room.sockets.get(socket);
			const currentRoleMsg = room.clientRoles.get(clientId);

			//only leader can start the game
			if (clientId != room.leaderId) {
				socket.send(JSON.stringify({ type: "error", text: "Only the leader can start the game" }));
				console.log(`Player (${currentRoleMsg}) tried to start the game but is not the leader in room ${room.name} (${room.id})`);
				return;
			}

			if (room.teamSize < 1) {
				socket.send(JSON.stringify({ type: "error", text: "insufficient players" }));
				console.log(`Player (${currentRoleMsg}) tried to start the game but insufficient player in room ${room.name} (${room.id})`);
				this.broadcast(room, createChatMessage("system", `Cannot start: insufficient players`));
				return;
			}

			//can start only if all players are ready
			if (!room.canStart) {
				socket.send(JSON.stringify({ type: "error", text: "Not all players are ready" }));
				console.log(`Player (${currentRoleMsg}) tried to start the game but not all players are ready in room ${room.name} (${room.id})`);
				this.broadcast(room, createChatMessage("system", `Cannot start: player not ready`));
				return;
			}

			console.log(`Player (${currentRoleMsg}) started the game in room ${room.name} (${room.id})`);
			room.gameState.countdown = 5 * 60; //? 5 seconds countdown
			room.startRequestedBy = clientId;
			room.gameStarted = false;
			room.gamePaused = false;
			this.broadcast(room, createChatMessage("system", `Game starting in ${room.gameState.countdown / 60} seconds...`));
			broadcastState(room);
		}
	}

	updateCanStart(room: any) {
		const prevCanStart = room.canStart;

		// get leader's role
	    const leaderId = room.leaderId;
	    const leaderRole = [...room.clientRoles.entries()]
	        .find(([cid, role]) => cid === leaderId)?.[1];

	    const allPlayers = [...room.gameState.teams.left, ...room.gameState.teams.right].filter(r => r !== "spectator");
	    const nonLeaderPlayers = leaderRole ? allPlayers.filter(r => r !== leaderRole) : allPlayers;
	    const allReady = nonLeaderPlayers.every((r: string) => room.readyStatus.get(r));
	    const totalPlayers = allPlayers.length;

	    room.canStart = allReady && totalPlayers > 1;

		if (room.canStart !== prevCanStart) {
    	    this.broadcast(room, {
    	        type: "state",
    	        gameState: room.gameState,
    	        leaderId: room.leaderId,
    	        canStart: room.canStart
    	    });
    	}

	    console.log("updateCanStart:", {
	        allPlayers,
	        leaderRole,
	        nonLeaderPlayers,
	        allReady,
	        totalPlayers,
	        canStart: room.canStart
	    });
	}


	handleSwitchSide(room: any, socket: any, newSide: "left" | "right"): string | undefined {
		const clientId = room.sockets.get(socket);
		if (!clientId)
			return;

		const currentRole = room.clientRoles.get(clientId);
		if (!currentRole || currentRole === "spectator")
			return;

		delete room.gameState.paddles[currentRole]; // Remove old paddle position

		//remove from current side
		room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== currentRole);
		room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== currentRole);

		//assign new role
		const newRole = `${newSide}_player${room.gameState.teams[newSide].length + 1}`;
		room.gameState.teams[newSide].push(newRole);

		room.clientRoles.set(clientId, newRole);

		// Transfer ready status to new role and remove old
		room.readyStatus.set(newRole, room.readyStatus.get(currentRole) || false);
		room.readyStatus.delete(currentRole);


		game.setPaddlePositionWithTeam(room);

		this.broadcast(room, createChatMessage("system", `${currentRole} switched to ${newRole}`));
		this.broadcast(room, {
			type: "state",
			gameState: room.gameState,
			leaderId: room.leaderId,
			canStart: room.canStart
		});
		console.log(`Player (${currentRole}) [ ${clientId} ] switched to ${newRole} in room ${room.name} (${room.id})`);

		// Notify the client of their new role
		if (socket) {
			socket.send(JSON.stringify({ type: "roleUpdate", newRole }));
		}

		return newRole;
	}

	/**
	 * @brief handle client disconnection from the WebSocket.
	 * @param socket The WebSocket connection for the client
	 * @param room The game room object
	 * @param clientId Unique identifier for the client
	 * @param role The role of the client (player, spectator, etc.)
	 * @param roomId The ID of the room
	*/
	handleDisconnect(socket: any, room: any, clientId: string, role:string, roomId: string) {
		// Prevent errors if room is already deleted
		if (!room || !room.sockets)
				return;

		delete room.gameState.paddles[role]; // Remove paddle position
		delete room.gameState.ball; // Remove ball position if no players left

		// Remove socket and client from room
		room.sockets.delete(socket);
		room.clients.delete(socket);

		const totalPlayer = room.gameState.teams.left.length + room.gameState.teams.right.length;

		//if only one player
		if (totalPlayer <= 1) {
			console.log(`Room ${room.name} (${roomId}) is empty. Deleting room.`);

			//close all remaining clients
			room.clients.forEach((client: any) => {
				if (client.readyState === 1) {
					client.send(JSON.stringify({ type: "system", text: "Room closed." }));
					client.close(1000, "Room closed");
				}
			});

			// Clean up room
			room.clients.clear();
			room.sockets.clear();
			room.clientRoles.clear();
			room.pendingDisconnects.clear();
			rooms.delete(roomId);
			return;
		}

		// if more tham one player, set 10 sec timeout
		if (role && role !== "spectator") {

			//remove the player
			room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== role);
			room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== role);

			delete room.gameState.paddles[role]; // Remove paddle position
			delete room.gameState.ball; // Remove ball position if no players left

			console.log(`Player (${role}) [ ${clientId} ] disconnect the room ${room.name} (${roomId})`);
			this.broadcast(room, createChatMessage("system", `${role} disconnect.`))

			this.updateCanStart(room);           // recalc canStart after player left
    		this.broadcast(room, {               // broadcast updated state to all remaining clients
    		    type: "state",
    		    gameState: room.gameState,
    		    leaderId: room.leaderId,
    		    canStart: room.canStart || false
    		});

			//set timeout for permanent disconnect
			const timeoutId = setTimeout(() => {
				console.log(`Player (${role}) [ ${clientId} ] exited the room ${room.name} (${roomId}) due to timeout.`);
				this.broadcast(room, createChatMessage("system", `${role} exited the game.`));
				this.broadcast(room, createChatMessage("system", `Game ended due to player disconnect for long time`));

				//end game and save result if player no return
				roomEndGame(room, true); // true: forced to end game

				// Disconnect all remaining clients
				room.clients.forEach((client: any) => {
					if (client.readyState === 1) {
						client.send(JSON.stringify({ type: "system", text: "Room closed." }));
						client.close(1000, "Room closed");
					}
				});

				// Clean up room
				room.clients.clear();
				room.sockets.clear();
				room.clientRoles.clear();
				room.pendingDisconnects.clear();
				rooms.delete(roomId);
			}, 10000); // 10 seconds timeout

			room.pendingDisconnects.set(clientId, timeoutId); // Store timeout ID for potential reconnection
		}
	}

	/**
	 * @brief Broadcast a message to all clients in the room.
	 * @param room The game room object
	 * @param msg The message object to broadcast
	 * @note Adds message to room chat history and sends to all connected clients
	*/
	broadcast(room: any, msg: any) {
		room.chatHistory.push(msg);
		for(const client of room.clients) {
			if (client.readyState === 1) {
				client.send(JSON.stringify(msg));
			}
		}
	}
};
