//declare these two custom properties
declare global {
	interface Window {
		pongCountdownStarted?: boolean;
		pongCountdownEnd?: number;
	}
}

export function startConnection(roomName: string) {
	createUI();

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;

	let role = "spectator";
	let clientId = sessionStorage.getItem("pongClientId");
	let gameOver = false; // game over flag
	let winner: string | null = null; // winner player

	// get the client ID from session storage or create a new one
	if (!clientId) {
		clientId = Math.floor(Math.random() * Math.pow(10, 6))
			.toString()
			.padStart(6, "0");
		sessionStorage.setItem("pongClientId", clientId);
	}
	console.log("clientId:", clientId);

	// open WebSocket connection
	const socket = new WebSocket(
		`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomName}`
	);

	socket.onopen = () => {
		console.log("WebSocket connected");
		socket.send(JSON.stringify({ type: "setHeight", height: canvas.height }));
		socket.send(JSON.stringify({ type: "setWidth", width: canvas.width }));
	};

	socket.onerror = (err) => console.error("WebSocket error:", err);
	socket.onclose = () => console.log("WebSocket closed");

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

	// Key handling
	const keys = { up: false, down: false };
	window.addEventListener("keydown", (e) => {
		if (role === "spectator" || gameOver) return;
		if (e.key === "ArrowUp") keys.up = true;
		if (e.key === "ArrowDown") keys.down = true;
	});
	window.addEventListener("keyup", (e) => {
		if (role === "spectator" || gameOver) return;
		if (e.key === "ArrowUp") keys.up = false;
		if (e.key === "ArrowDown") keys.down = false;
	});

	// Chat input
	const chatInput = document.getElementById("chatInput") as HTMLInputElement;
	chatInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && chatInput.value.trim() !== "") {
			socket.send(JSON.stringify({ type: "chat", text: chatInput.value.trim() }));
			chatInput.value = "";
		}
	});

	// Send movement
	setInterval(() => {
		if (role === "spectator" || gameOver) return;
		if (keys.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
		if (keys.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
	}, 1000 / 60);
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
		return;
	}

	const leftPlayers = state.teams.left.length;
	const rightPlayers = state.teams.right.length;
	const allPlayersConnected =
		(leftPlayers === 2 && rightPlayers === 2) ||
		(leftPlayers === 1 && rightPlayers === 1 && leftPlayers + rightPlayers === 2);

	// Waiting message
	if (!allPlayersConnected) {
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

	// Countdown before start
	if (!state.gameStarted && state.countdown > 0) {
		const remaining = Math.ceil(state.countdown / 60);
		ctx.font = "48px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText(`Game starts in ${remaining}...`, canvas.width / 2, canvas.height / 2);
		return;
	}

	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
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
	canvas.width = Math.min(window.innerWidth * 0.9, 600);
	canvas.height = Math.min(window.innerHeight * 0.7, 400);
	canvas.style.border = "5px solid black";
	document.body.appendChild(canvas);

	const chatBox = document.createElement("div");
	chatBox.id = "chatBox";
	chatBox.style.width = "600px";
	chatBox.style.height = "200px";
	chatBox.style.overflowY = "auto";
	chatBox.style.border = "2px solid gray";
	chatBox.style.marginTop = "10px";
	chatBox.style.padding = "5px";
	document.body.appendChild(chatBox);

	const chatInput = document.createElement("input");
	chatInput.id = "chatInput";
	chatInput.type = "text";
	chatInput.placeholder = "Type a message and press Enter...";
	chatInput.style.width = "600px";
	chatInput.style.marginTop = "5px";
	document.body.appendChild(chatInput);
}
