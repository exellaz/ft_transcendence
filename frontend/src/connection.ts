//declare these two custom properties
declare global {
	interface Window {
		pongCountdownStarted?: boolean;
		pongCountdownEnd?: number;
	}
}

export function startConnection() {
	createUI();

	const canvas = document.getElementById("game") as HTMLCanvasElement;
	let role = "spectator";
	const roleText = document.getElementById("roleText")!;
	const scoreText = document.getElementById("scoreText")!;

	//get the client ID from session storage or create a new one
	let clientId = sessionStorage.getItem("pongClientId");
	if (!clientId) { // if client ID does not exist
		clientId = generateUID(); // function for create unique ID and store it
		sessionStorage.setItem("pongClientId", clientId);
	}

	// Connect to Fastify server WebSocket (?id=<clientId> : is a query parameter)
	let roomId: string | null = null;
    while (!roomId) {
        roomId = prompt("enter room name:");
        if (!roomId) {
            alert("Room name is required!");
            continue;
        }
    }
	const socket = new WebSocket(`ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}`);

	//handle the WebSocket events
	socket.onopen = () => {
		console.log("WebSocket connected");

		// Send canvas size to server
		if (canvas) {
			socket.send(JSON.stringify({ type: "setHeight", height: canvas.height }));
			socket.send(JSON.stringify({ type: "setWidth", width: canvas.width }));
		}
	};

	socket.onerror = (err) => console.error("WebSocket error:", err);
	socket.onclose = () => console.log("WebSocket closed");

	//handle incoming messages from server
	socket.onmessage = (event) => {
		try {
			const data = JSON.parse(event.data);

			// Role assign to print
			if (data.type === "role") {
				role = data.role;
				roleText.textContent = `Room: ${data.roomId} | Role: ${role}`;
				//if (role.startsWith("left_player")) {
				//	roleText.textContent = `Left Team (${role})`;
				//} else if (role.startsWith("right_player")) {
				//	roleText.textContent = `Right Team (${role})`;
				//} else {
				//	roleText.textContent = "Spectator";
				//}
			}

			// Game state update
			if (data.type === "state") {
				draw_container(data.gameState, data.isSpectator);
				scoreText.textContent = `Score: ${data.gameState.score.left} - ${data.gameState.score.right}`;
			}
		} catch (err) {
			console.error("Invalid JSON from server:", event.data);
		}
	};

	// Key handling
	const keys = { up: false, down: false };
	window.addEventListener("keydown", (e) => {
		if (role === "spectator") return;
		if (e.key === "ArrowUp") keys.up = true;
		if (e.key === "ArrowDown") keys.down = true;
	});
	window.addEventListener("keyup", (e) => {
		if (role === "spectator") return;
		if (e.key === "ArrowUp") keys.up = false;
		if (e.key === "ArrowDown") keys.down = false;
	});

	// Send movement to server
	setInterval(() => {
		if (role === "spectator") return;
		if (keys.up) socket.send(JSON.stringify({ type: "move", role, dy: -10 }));
		if (keys.down) socket.send(JSON.stringify({ type: "move", role, dy: 10 }));
	}, 1000 / 60);
}

/////////////////////////////////// EXTERNAL FUNCTIONS ///////////////////////////////////

//generate UID
function generateUID(): string {
  return (
	Date.now().toString(36) +      // timestamp part
	Math.random().toString(36).substr(2, 8) // random part
  );
}

/**
 * @brief draw container in html (pong game)
 * @param state - current game state from server
*/
function draw_container(state: any, isSpectator?: boolean) {
	const canvas = document.getElementById("game") as HTMLCanvasElement;
	if (!canvas) throw new Error("Canvas not found!");
	const ctx = canvas.getContext("2d")!;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// Get expected team size from backend (TEAM_SIZE)
	const expectedPlayers = state.teams?.left?.length + state.teams?.right?.length;
	const allPlayersConnected = state.teams?.left?.length === state.teams?.right?.length && state.teams?.left?.length > 0 && expectedPlayers === state.teams?.left?.length * 2;

	// Spectator: always draw game, ignore countdown
	if (isSpectator) {
		// Draw ball
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		// Draw paddles
		const paddleWidth = 10;
		const paddleHeight = 80;
		for (const key in state.paddles) {
			const y = state.paddles[key];
			let x;
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

        if (!allPlayersConnected) {
            // Not all players connected, show waiting message
            ctx.font = "32px Arial";
            ctx.fillStyle = "gray";
            ctx.textAlign = "center";
            ctx.fillText("Waiting for all players to connect...", canvas.width / 2, canvas.height / 2);
        }
		return;
	}

	// Player: only draw if all players are connected
	if (allPlayersConnected) {
		// Use backend countdown and gameStarted
		if (!state.gameStarted && state.countdown > 0) {
			const remaining = Math.ceil(state.countdown / 60); // assuming 60 ticks per second
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
		const paddleWidth = 10;
		const paddleHeight = 80;
		for (const key in state.paddles) {
			const y = state.paddles[key];
			let x;
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
	} else {
		// Not all players connected, show waiting message
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", canvas.width / 2, canvas.height / 2);
	}
}

// Create basic UI elements
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
	canvas.width = Math.min(window.innerWidth * 0.9, 600); //set fixed size (600)
	canvas.height = Math.min(window.innerHeight * 0.7, 400); //set fixed size(400)
	canvas.style.border = "5px solid black";
	document.body.appendChild(canvas);
}
