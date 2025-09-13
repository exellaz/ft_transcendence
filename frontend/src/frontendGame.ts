import { showLobby } from "./frontendLobby.ts";
import { PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE } from "./frontendRoom.ts";
import { scaledWidth, scaledHeight } from "./main.ts";
import { initChatConnection, initChatUI } from "./globalChat.ts";

//declare these two custom properties
declare global {
	interface Window {
		pongCountdownStarted?: boolean;
		pongCountdownEnd?: number;
	}
}

export function startGame(roomId: string, roomName: string, socket: WebSocket, clientId: string, role: string, keys: { up: boolean, down: boolean }) {
	createUI();

	initChatConnection();
	initChatUI();

	// sessionStorage.setItem("pongRoomId", roomId);
	// sessionStorage.setItem("pongRoomName", roomName);

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;
	const backBtn = document.getElementById("backLobbyBtn") as HTMLButtonElement;

	// let role = "spectator";
	// let clientId = sessionStorage.getItem("pongClientId");
	let gameOver = false; // game over flag
	let winner: string | null = null; // winner player

	//prevent accidental refresh/close while in game
	const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
		if (!gameOver) {
			e.preventDefault();
			e.returnValue = "Game in progress. Are you sure you want to leave?";
			return e.returnValue;
		}
	};

	// const keys = { up: false, down: false };
	const keyhandler = (e: KeyboardEvent) => {
		if (!gameOver) {
			if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")) {
				e.preventDefault();
				return;
			}
			if (role !== "spectator") {
				if (e.type === "keydown") {
					if (e.key === "ArrowUp") keys.up = true;
					if (e.key === "ArrowDown") keys.down = true;
				}
				if (e.type === "keyup") {
					if (e.key === "ArrowUp") keys.up = false;
					if (e.key === "ArrowDown") keys.down = false;
				}
			}
		}
	};
	const disableContextMenu = (e: Event) => e.preventDefault();
	window.addEventListener("contextmenu", disableContextMenu); // disable right-click context menu
	window.addEventListener("beforeunload", beforeUnloadHandler);
	window.addEventListener("keydown", keyhandler);
	window.addEventListener("keyup", keyhandler);

	// get the client ID from session storage or create a new one
	if (!clientId) {
		clientId = "P" + Math.floor(Math.random() * Math.pow(10, 6))
			.toString()
			.padStart(6, "0");
		sessionStorage.setItem("pongClientId", clientId);
	}

	// const socket = new WebSocket(
	// 	`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}`
	// );

	// Notify server about the game size once connection is open
	socket.addEventListener("open", () => {
		sendRoomSize(socket, scaledWidth, scaledHeight);
	});

	socket.onopen = () => console.log("WebSocket connected");
	socket.onclose = () => console.log("WebSocket closed");
	socket.onerror = (err) => console.error("WebSocket error:", err);

	// Back button logic (different for spectators vs players)
	backBtn.onclick = () => {
		if (backBtn.disabled) return;
		cleanUp(false);
		document.body.innerHTML = "";
		if (socket.readyState === WebSocket.OPEN) socket.close();
		showLobby();
	};

	//receive message from server
	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			// Role assign
			if (data.type === "roleUpdate") {
				console.log("Role update from game:", data);
				// --- update player position ---
				if (clientId === data.gameState.teams.left.find((p: any) => p.clientId === clientId)?.clientId) {
					role = data.gameState.teams.left.find((p: any) => p.clientId === clientId)?.role;
				} else if (clientId === data.gameState.teams.right.find((p: any) => p.clientId === clientId)?.clientId) {
					role = data.gameState.teams.right.find((p: any) => p.clientId === clientId)?.role;
				} else {
					role = "spectator";
				}
				roleText.textContent = `Room: ${roomName} [${roomId}] | Player [${role.startsWith("left") ? "Player Left" : role.startsWith("right") ? "Player Right" : "Spectator"}]`;

				//enable back button if is spectator
				if (role === "spectator")
					backBtn.disabled = false;
			}

			// Game state update
			if (data.type === "state") {
				console.log("Game state update:", data); ////debug
				console.log("backBtn disabled:", backBtn.disabled, "role:", role, "winner:", data.gameState.result?.winner);

				// Set winner/game over if exists
				if (data.gameState.result?.winner && !gameOver) {
					console.log("Game Over. Winner:", data.gameState.result.winner);
					gameOver = true;
					cleanUp(true);
					winner = data.gameState.result.winner;

					//enable back button after game over
					backBtn.disabled = false;
				}

				//prevent player click back button during game
				if (!gameOver) {
					if (role !== "spectator")
						backBtn.disabled = true;
					else
						backBtn.disabled = false;
				}

				draw_container(data.gameState, data.isSpectator, winner);
				roleText.textContent = `Room: ${roomName} | Role: ${role}`;
				scoreText.textContent = `Score: ${data.gameState.score.left} - ${data.gameState.score.right}`;
			}
		} catch (err) {
			console.error("Invalid JSON from server:", event.data);
		}
	};

	//handle resize dynamically
	window.addEventListener("resize", () => {
		canvas.width = scaledWidth;
		canvas.height = scaledHeight;
		sendRoomSize(socket, scaledWidth, scaledHeight);
	});

	// Send key presses at 60 FPS to server
	setInterval(() => {
		if (role !== "spectator" && !gameOver) {
			if (keys.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
			if (keys.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
		}
	}, 1000 / 60);

	// clean up all event and room after end game
	function cleanUp(quitGame = false) {
		window.removeEventListener("contextmenu", disableContextMenu);
		window.removeEventListener("beforeunload", beforeUnloadHandler);
		window.removeEventListener("keydown", keyhandler);
		window.removeEventListener("keyup", keyhandler);
		sessionStorage.removeItem("pongRoomName");
		sessionStorage.removeItem("pongRoomId");

		//if player quit the game
		if (!quitGame) {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.close();
			}
		}
	}
}

/////////////////////////////////// EXTERNAL FUNCTIONS ///////////////////////////////////

function draw_container(state: any, isSpectator?: boolean, winner: string | null = null) {
	const canvas = document.getElementById("game") as HTMLCanvasElement;
	const ctx = canvas.getContext("2d")!;
	const paddleWidth = PADDLEWIDTH;
	const paddleHeight = PADDLEHEIGHT;
	const ballSize = BALLSIZE;

	// Clear canvas each frame
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Show winner and stop game display
	if (winner) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(`Player ${winner} wins!`, canvas.width / 2, canvas.height / 2);
		return;
	}

	const leftPlayers = state.teams.left.length;
	const rightPlayers = state.teams.right.length;
	const allPlayersConnected =
		(leftPlayers === 2 && rightPlayers === 2) ||
		(leftPlayers === 1 && rightPlayers === 1 && leftPlayers + rightPlayers === 2);

	//pause message
	if (state.paused) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "red";
		ctx.textAlign = "center";
		ctx.fillText(`Game Paused`, canvas.width / 2, canvas.height / 2);

		// Optional: also show frozen countdown if it exists
		if (!state.gameStarted && state.countdown > 0) {
			const remaining = Math.ceil(state.countdown / 60);
			ctx.font = "32px Arial";
			ctx.fillStyle = "gray";
			ctx.fillText(`Countdown stopped at ${remaining}`, canvas.width / 2, canvas.height / 2 + 50);
		}
		return;
	}

	// Countdown before start
	if (!state.gameStarted && state.countdown > 0) {
		const remaining = Math.ceil(state.countdown / 60);
		ctx.font = "48px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText(`Game starts in ${remaining}...`, canvas.width / 2, canvas.height / 2);
		return;
	}

	// Waiting message
	if (!allPlayersConnected && !state.gameStarted) {
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", canvas.width / 2, canvas.height / 2);
		return;
	}

	const scaleX = canvas.width / 800;
	const scaleY = canvas.height / 400;

	// Spectator view
	if (isSpectator) {
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, ballSize, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		for (const clientId in state.paddles) {
			const y = state.paddles[clientId];
			let x: number;
			if (state.teams.left.some((p: any) => p.clientId === clientId)) {
				x = 1 * scaleX; // left side
			} else if (state.teams.right.some((p: any) => p.clientId === clientId)) {
				x = canvas.width - paddleWidth * scaleX - 1; // right side
			} else {
				continue; // not a player
			}
			ctx.fillStyle = "black";
			ctx.fillRect(x, y, paddleWidth * scaleX, paddleHeight * scaleY);
		}
		return;
	}


	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballSize * scaleX, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
	for (const clientId in state.paddles) { //look for player id in paddles
		const y = state.paddles[clientId];
		let x: number;
		//check left is belong this player or not
		if (state.teams.left.some((p: any) => p.clientId === clientId)) {
			x = 1 * scaleX; // left side
		} else if (state.teams.right.some((p: any) => p.clientId === clientId)) {
			x = canvas.width - paddleWidth * scaleX - 1; // right side
		} else {
			continue; // not a player
		}
		ctx.fillStyle = "black";
		ctx.fillRect(x, y, paddleWidth * scaleX, paddleHeight * scaleY);
	}
}

function createUI() {
	const roleText = document.createElement("h1");
	roleText.id = "roleText";
	roleText.textContent = "Connecting...";
	document.body.appendChild(roleText);

	const scoreText = document.createElement("h2");
	scoreText.id = "scoreText";
	scoreText.textContent = "Score: 0 - 0";
	document.body.appendChild(scoreText);

	const canvas = document.createElement("canvas");
	canvas.id = "game";
	canvas.width = scaledWidth;
	canvas.height = scaledHeight;
	canvas.style.border = "5px solid black";
	document.body.appendChild(canvas);

	// Always show Back to Lobby button
	const backBtn = document.createElement("button");
	backBtn.id = "backLobbyBtn";
	backBtn.textContent = "Back to Lobby";
	backBtn.style.display = "block";
	backBtn.style.margin = "20px auto";
	backBtn.style.fontSize = "18px";
	document.body.appendChild(backBtn);
}

function sendRoomSize(ws: WebSocket, width: number, height: number) {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ type: "setWidth", width }));
		ws.send(JSON.stringify({ type: "setHeight", height }));
		console.log(`send room size: ${width}x${height}`);
	}
}
