// server.ts
import Fastify from "fastify";
import websocketPlugin, { WebSocket } from "@fastify/websocket";
import { URL } from "url";

// ---- SETUP SERVER ----
const fastify = Fastify();
await fastify.register(websocketPlugin);


// ---- GAME CONFIGURATION ----
let gameWidth = 0;
let gameHeight = 0;
let TEAM_SIZE = 1; //1 => 1vs1, 2 => 2vs2 and so on
let gameStarted = false
const gameState: { //assign thier type
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [key: string]: number };
  teams: { left: string[]; right: string[] };
  score: { left: number; right: number };
  countdown: number;
} = {	//assign their initial values
  ball: { x: 300, y: 200, dx: 2, dy: 2 },	//position of the ball
  paddles: {},								//number of paddle will be number of players
  teams: { left: [], right: [] },			//initialize teams
  score: { left: 0, right: 0 },				//game score
  countdown: 0,								//countdown timer
};

// ---- INITIALIZE CLIENTS ----
const clients = new Set<WebSocket>();				//all connected client
const clientRoles: Map<string, string> = new Map();	//client ID with the role
const sockets: Map<WebSocket, string> = new Map();	//socket with the client ID

// ---- WebSocket route ----
//setup the multiplayer game, manage client and process real-time message for game
await fastify.register(async function (fastify) {						//register the websocket route on fastify server
  fastify.get("/ws", { websocket: true }, (socket, req) => {			//get the websocket connection for clients to join the server
	const url = new URL(req.url!, `http://${req.headers.host}`);		//create an url object from request URL and host header
	const clientId = url.searchParams.get("id") || crypto.randomUUID();	//get the client ID from URL, if not then generate a new one
	sockets.set(socket, clientId);										//map the socket with the client ID (to check which socket belong to which client)
	clients.add(socket);												//add the socket to the set of connected clients (to keep track of all current connected client)

	// Assign or restore role
	let role = clientRoles.get(clientId);
	if (!role) {	// if client not role yet
		// Hardcode team assignment: alternate left/right
		const leftCount = gameState.teams.left.length;		// Count of players in the left team
		const rightCount = gameState.teams.right.length;	// Count of players in the right team
		if (leftCount < TEAM_SIZE) {						//set left player role
			role = `left_player${leftCount + 1}`;
			gameState.teams.left.push(role);
		} else if (rightCount < TEAM_SIZE) {				//set right player role
			role = `right_player${rightCount + 1}`;
			gameState.teams.right.push(role);
		}
		else
			role = "spectator";								//set spectator
		clientRoles.set(clientId, role);					//map the client ID with the role
		if (role !== "spectator")							//if is a player set their paddle possition and score reset to 0
		{
			set_paddle_position_with_team();
			gameState.score.left = 0;
			gameState.score.right = 0;
		}
	} else {	//if client already have role (mostly disconnect / close tab)
		// restore role and ensure in the correct team
		if (role.startsWith("left_player") && !gameState.teams.left.includes(role))	//if the role is left_player and not in the left team
			gameState.teams.left.push(role);	//assign to it
		else if (role.startsWith("right_player") && !gameState.teams.right.includes(role))
			gameState.teams.right.push(role);
	}

	console.log(`Client (${role}) connected with id=${clientId}`);
	socket.send(JSON.stringify({ type: "role", role })); //send the role info to the client

	// ---- HANDLE INCOMING MESSAGES/EVENTS ----
	socket.on("message", (raw) => {
		const msg = JSON.parse(raw.toString());	//parse the incoming message/event from client
		if (msg.type === "move") {  //if the message type is "move"
			const dy = msg.dy;         //get the position of the paddle
			const paddleHeight = 80;   //height of the paddle
			if (role.startsWith("left_player") || role.startsWith("right_player")) {
				// Use role as the key, e.g., "player1", "player2", "player3", etc.
				gameState.paddles[role] = updatePaddlePosition(gameState.paddles[role] ?? 0, dy, gameHeight, paddleHeight);
			}
		} else if (msg.type === "setWidth") {	//check the client game width and assign it
			gameWidth = msg.width;
		} else if (msg.type === "setHeight") { //check the client game height and assign it
			gameHeight = msg.height;
		}
	});

	// ---- HANDLE DISCONNECTION ----
	socket.on("close", () => {
	  sockets.delete(socket);	//delete the socket from the map
	  console.log(`Client (${role}) disconnected (id=${clientId})`);

	  //remove player from team if not spectator
	  if (role && role !== "spectator") {
		  const leftIdx = gameState.teams.left.indexOf(role); //check if the player is in the left team
		  if (leftIdx !== -1)	//check if the player is in the left team
				gameState.teams.left.splice(leftIdx, 1); //remove the player from the left team
		  const rightIdx = gameState.teams.right.indexOf(role);
		  if (rightIdx !== -1)
				gameState.teams.right.splice(rightIdx, 1);
	  }
	});
  });
});

// ---- START THE GAME LOOP ----
setInterval(gameLoop, 1000 / 60); //60 FPS

//start the server and listen to port 4242
fastify.listen({ port: 4242, host: '0.0.0.0' }, (err, addr) => {
	if (err) throw err;
	console.log(`Server running at ${addr}`);
})

////////////////////////////////////////////////// EXTERNAL FUNCTION //////////////////////////////////////////////////
/**
 * @brief reset the ball to the center
 * @param scoredSide - which side scored ("left" or "right")
*/
function resetBall(scoredSide: "left" | "right") {
  gameState.ball.x = gameWidth / 2;
  gameState.ball.y = gameHeight / 2;
  gameState.ball.dx = scoredSide === "left" ? -2 : 2;
  gameState.ball.dy = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2));
}

/**
 * @brief set each paddle position based on team
*/
function set_paddle_position_with_team()
{
	const paddleHeight = 80;
	if (TEAM_SIZE === 1)
	{
		gameState.paddles["left_player1"] = gameHeight / 2;
		gameState.paddles["right_player1"] = gameHeight / 2;
	}
	else if (TEAM_SIZE === 2)
	{
		gameState.paddles["left_player1"] = gameHeight / 4;
		gameState.paddles["left_player2"] = (gameHeight * 3) / 4 - paddleHeight;
		gameState.paddles["right_player1"] = gameHeight / 4;
		gameState.paddles["right_player2"] = (gameHeight * 3) / 4 - paddleHeight;
	}
	else if (TEAM_SIZE === 3)
	{
		const gap = (gameHeight - 3 * paddleHeight) / 4;
		gameState.paddles["left_player1"] = gap;
		gameState.paddles["left_player2"] = gap * 2 + paddleHeight;
		gameState.paddles["left_player3"] = gap * 3 + paddleHeight * 2;
		gameState.paddles["right_player1"] = gap;
		gameState.paddles["right_player2"] = gap * 2 + paddleHeight;
		gameState.paddles["right_player3"] = gap * 3 + paddleHeight * 2;
	}
	else if (TEAM_SIZE === 4)
	{
		const gap = (gameHeight - 4 * paddleHeight) / 5;
		gameState.paddles["left_player1"] = gap;
		gameState.paddles["left_player2"] = gap * 2 + paddleHeight;
		gameState.paddles["left_player3"] = gap * 3 + paddleHeight * 2;
		gameState.paddles["left_player4"] = gap * 4 + paddleHeight * 3;
		gameState.paddles["right_player1"] = gap;
		gameState.paddles["right_player2"] = gap * 2 + paddleHeight;
		gameState.paddles["right_player3"] = gap * 3 + paddleHeight * 2;
		gameState.paddles["right_player4"] = gap * 4 + paddleHeight * 3;
	}
}

/**
 * @brief update each paddle position when move
 * @param current - current paddle position
 * @param dy - change in position
 * @param gameHeight - height of the game area
 * @param paddleHeight - height of the paddle
 * @return new paddle position
*/
function updatePaddlePosition(current: number, dy: number, gameHeight: number, paddleHeight: number): number {
		return Math.max(0, Math.min(gameHeight - paddleHeight, current + dy));
}

/**
 * @brief update the ball position
*/
function updateBall() {
	if (!gameStarted) return; // Do not update ball if game hasn't started
	const ball = gameState.ball;
	ball.x += ball.dx;
	ball.y += ball.dy;

	const paddleHeight = 80;
	const paddleWidth = 20;
	const ballRadius = 10;

	// Bounce top/bottom
	if (ball.y <= 0) {
		ball.y = 0;
		ball.dy *= -1;
	} else if (ball.y >= gameHeight) {
		ball.y = gameHeight;
		ball.dy *= -1;
	}

	// paddle collision
	for (const key in gameState.paddles) {
		const paddleY = gameState.paddles[key];
		// Left side paddles
		if (key.startsWith("left_player") && ball.x <= paddleWidth) {
			if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
				ball.dx *= -1;
				ball.x = paddleWidth;
			}
		}
		// Right side paddles
		if (key.startsWith("right_player") && ball.x + ballRadius >= gameWidth - paddleWidth) {
			if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
				ball.dx *= -1;
				ball.x = gameWidth - paddleWidth - ballRadius;
			}
		}
	}

	// Scoring
	if (ball.x + ballRadius < 0) {
		gameState.score.right++;
		resetBall("right");
	} else if (ball.x - ballRadius > gameWidth) {
		gameState.score.left++;
		resetBall("left");
	}
}

/**
 * @brief loop the game
*/
function gameLoop() {
	// Only update ball and game state if both teams have exactly TEAM_SIZE players
	if (gameState.teams.left.length === TEAM_SIZE && gameState.teams.right.length === TEAM_SIZE) {
		if (!gameStarted) {
			// Start countdown
			if (!gameState.countdown || gameState.countdown <= 0) {
				gameState.countdown = 5 * 60; // 5 seconds at 60 FPS
		} else {
			gameState.countdown--;
			if (gameState.countdown <= 0) {
				gameStarted = true;
			}
		}
		} else {
			updateBall();
		}
	} else {
		// Not enough players, reset game
		gameStarted = false;
		gameState.countdown = 0;
	}


	// Broadcast game state to all connected clients
	for (const client of clients) {
		if (client.readyState === 1) {
			client.send(JSON.stringify({ type: "state", gameState }));
		}
	}
}
