import { showLobby, scaledWidth, scaledHeight } from "./main.ts";

//declare these two custom properties
declare global {
	interface Window {
		pongCountdownStarted?: boolean;
		pongCountdownEnd?: number;
		chatInitialized?: boolean;
	}
}


export function startConnection(roomName: string, socket: WebSocket) {
	createUI();

	sessionStorage.setItem("pongRoomName", roomName);

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;

	let role = "spectator";
	let clientId = sessionStorage.getItem("pongClientId");
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

	const keys = { up: false, down: false };
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
	window.addEventListener("contextmenu", (e) => e.preventDefault()); // disable right-click context menu
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

	// Notify server about the game size once connection is open
	socket.addEventListener("open", () => {
		// Send room size to server
		sendRoomSize(socket, scaledWidth, scaledHeight);
	});

	socket.onopen = () => console.log("WebSocket connected");
	socket.onerror = (err) => console.error("WebSocket error:", err);
	socket.onclose = () => console.log("WebSocket closed");

	//receive message from server
	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			// Role assign
			if (data.type === "role") {
				role = data.role;
				roleText.textContent = `Room: ${data.roomId} | Role: ${role}`;
			}

			// Game state update
			if (data.type === "state") {
				// Set winner/game over if exists
				if (data.gameState.result?.winner) {
					gameOver = true;
					cleanUp();
					winner = data.gameState.result.winner;
				}

				draw_container(data.gameState, data.isSpectator, winner);
				scoreText.textContent = `Score: ${data.gameState.score.left} - ${data.gameState.score.right}`;
			}

			// Chat messages
			if (data.type === "chat") {
				const chatBox = document.getElementById("chatBox")!;
				const msgDiv = document.createElement("div");
				const time = new Date(data.time).toLocaleTimeString();
				msgDiv.textContent = `[${time}] ${data.from}: ${data.text}`;
				chatBox.appendChild(msgDiv);
				chatBox.scrollTop = chatBox.scrollHeight;
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
	function cleanUp() {
		window.removeEventListener("contextmenu", (e) => e.preventDefault());
		window.removeEventListener("beforeunload", beforeUnloadHandler);
		window.removeEventListener("keydown", keyhandler);
		window.removeEventListener("keyup", keyhandler);
		sessionStorage.removeItem("pongRoomName");
	}
}

/////////////////////////////////// EXTERNAL FUNCTIONS ///////////////////////////////////

function draw_container(state: any, isSpectator?: boolean, winner: string | null = null) {
	const canvas = document.getElementById("game") as HTMLCanvasElement;
	const ctx = canvas.getContext("2d")!;
	const paddleWidth = 10;
	const paddleHeight = 80;

	// Clear canvas each frame
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Show winner and stop game display
	if (winner) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(`Player ${winner} wins!`, canvas.width / 2, canvas.height / 2);

		//back to lobby
		if (!document.getElementById("backLobbyBtn")) {
			const btn = document.createElement("button");
			btn.id = "backLobbyBtn";
			btn.textContent = "Back to Lobby";
			btn.style.display = "block";
			btn.style.margin = "20px auto";
			btn.style.fontSize = "18px";
			document.body.appendChild(btn);

			btn.onclick = () => {
				document.body.innerHTML = "";
				showLobby();
			};
		}
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

	// Spectator view
	if (isSpectator) {
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		for (const key in state.paddles) {
			const y = state.paddles[key];
			let x: number;
			if (key.startsWith("left_player")) {
				x = 1;
			} else if (key.startsWith("right_player")) {
				x = canvas.width - paddleWidth - 1;
			} else {
				continue;
			}
			ctx.fillStyle = "black";
			ctx.fillRect(x, y, paddleWidth, paddleHeight);
		}
		return;
	}

	const scaleX = canvas.width / 800;
	const scaleY = canvas.height / 400;

	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x, state.ball.y * scaleY, 10 * scaleX, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
	for (const key in state.paddles) {
		const y = state.paddles[key];
		let x: number;
		if (key.startsWith("left_player")) {
			x = 1 * scaleX;
		} else if (key.startsWith("right_player")) {
			x = canvas.width - paddleWidth * scaleX - 1;
		} else {
			continue;
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
	canvas.width = scaledWidth
	canvas.height = scaledHeight;
	canvas.style.border = "5px solid black";
	document.body.appendChild(canvas);
}

function sendRoomSize(ws: WebSocket, width: number, height: number) {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ type: "setWidth", width }));
		ws.send(JSON.stringify({ type: "setHeight", height }));
		console.log(`send room size: ${width}x${height}`);
	}
}


// --- Shared Chat UI ---
export function createChatUI(socket: WebSocket) {
    let chatBox = document.getElementById("chatBox");
    if (!chatBox) {
        chatBox = document.createElement("div");
        chatBox.id = "chatBox";
        chatBox.style.position = "absolute";
        chatBox.style.bottom = "60px";
        chatBox.style.right = "20px";
        chatBox.style.width = "300px";
        chatBox.style.height = "200px";
        chatBox.style.overflowY = "auto";
        chatBox.style.border = "2px solid gray";
        chatBox.style.background = "rgba(255,255,255,0.8)";
        chatBox.style.padding = "5px";
        document.body.appendChild(chatBox);
    }

    let chatInput = document.getElementById("chatInput") as HTMLInputElement;
    if (!chatInput) {
        chatInput = document.createElement("input");
        chatInput.id = "chatInput";
        chatInput.type = "text";
        chatInput.placeholder = "Type a message and press Enter...";
        chatInput.style.position = "absolute";
        chatInput.style.bottom = "20px";
        chatInput.style.right = "20px";
        chatInput.style.width = "300px";
        document.body.appendChild(chatInput);
    }

    if (!chatInput.dataset.bound) {
        chatInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && chatInput.value.trim() !== "") {
                socket.send(JSON.stringify({ type: "chat", text: chatInput.value.trim() }));
                chatInput.value = "";
            }
        });
        chatInput.dataset.bound = "true";  // mark as bound
    }
}
