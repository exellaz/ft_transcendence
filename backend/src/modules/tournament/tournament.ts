import { tournaments, TournamentMatch} from "./tournament.routes";
import { rooms, roomEndGame, generateRoomId, startRoomLoop } from "../room/room";
import { PongGame } from "@shared/game/pong.ts";
import { playerInfo, Room } from "../../utils/interface";
import WebSocket from "ws";

// Start tournament countdown and manage tournament progression
export function startTournamentCountdown(
	tournamentId: number,
	broadcast: (msg: string) => void,
	countdownTime: number,
	client: Map<WebSocket, { tournamentId: number; playerId: number }>
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.countdownTimer) return;

  //set timer for the tournament start
  tournament.countdownRemaining = countdownTime;

  //broadcast countdown every second
  tournament.countdownTimer = setInterval(() => {
	const t = tournaments.get(tournamentId);
	if (!t) return;

	//if countdown is still running, broadcast remaining time
	if (t.countdownRemaining! > 0) {
		broadcast(JSON.stringify({ type: "countdown", remaining: t.countdownRemaining }));
		t.countdownRemaining!--;
	} else {
	  //if count down finished, start the tournament
	  clearInterval(t.countdownTimer);
	  t.countdownTimer = undefined;
	  t.countdownRemaining = undefined;
	  t.started = true;

	  //shuffle players and create matches
	  const shuffeld = [...t.players].sort(() => 0.5 - Math.random());
	  const matches: TournamentMatch[] = [];

	  // Create game rooms for each pair of players
	  for (let i = 0; i < shuffeld.length; i += 2) {
		const pair = shuffeld.slice(i, i + 2);
		const room = createGameRoom(tournamentId, pair);
		console.log("Tournament game room created:", room); ////debug

		// Assign WebSocket clients to the game room
		for (const [ws, info] of client.entries()) {
		  if (info.tournamentId === tournamentId) {
			const matchPlayer = pair.find(p => p.id === info.playerId);
			if (matchPlayer) {
			  room.clients.add(ws);
			  room.sockets.set(ws, info.playerId);

			  //send few info for game websocket need
			  const playerInfo = room.clientRoles.get(info.playerId);
			  if (playerInfo) {
				ws.send(JSON.stringify({
					type: "getPlayerTeam",
					roomId: room.id,
					roomName: tournament.stage,
					team: playerInfo.team === "left" ? "left" : "right",
				}));
			  }
			}
		  }
		}

		// Initialize match with no winner yet and start game loop
		matches.push({ roomId: room.id, players: pair, winnerId: -1 });
		startRoomLoop(room);
	  }

	  // Update tournament with matches and advance stage
	  t.matches = matches;
	  t.stage = "quarterfinals";

	  // Notify all clients that the tournament has started
	  broadcast(JSON.stringify({ type: "tournamentStarted", stage: t.stage, matches: t.matches }));
	  console.log (`Tournament ${tournamentId} started with ${t.players.length} players`); //// debug
	}
  }, 1000);
  console.log (`Tournament ${tournamentId} countdown started`); //// debug
}

// Cancel the tournament countdown
export function cancelTournamentCountdown(tournamentId: number, broadcast: (msg: string) => void) {
	const tournament = tournaments.get(tournamentId);
	if (!tournament || !tournament.countdownTimer) return;

	clearInterval(tournament.countdownTimer);
	tournament.countdownTimer = undefined;
	tournament.countdownRemaining = undefined;
	broadcast(JSON.stringify({ type: "countdownCancel" }));
	console.log (`Tournament ${tournamentId} countdown cancelled`); //// debug
}

// Create a game room for a pair of players in the tournament
export function createGameRoom(
	tournamentId: number,
	playerPair: { id: number, username: string, spriteUrl: string }[]
) {
	const roomId = generateRoomId();
	const roomName = `Tournament ${tournamentId} - Room ${roomId}`;

	// Initialize Pong game instance
	const pongGame = new PongGame(
	  false,
	  {
		ballSpeed: 1,
		ballSize: 1,
		paddleSpeed: 1,
		scorePoint: 1,
		map: "stadium",
	  },
	  (winner) => {
		const room = rooms.get(roomId);
		if (!room) return;
		roomEndGame(room, true, winner);
	  }
	);

	// Ensure both players are defined
	if (!playerPair[0] || !playerPair[1]) {
		throw new Error("playerPair must contain two defined players");
	}

	// Define player info for both players
	const leftPlayer: playerInfo = {
		clientId: playerPair[0].id,
		playerName: playerPair[0].username,
		role: "left_player1",
		team: "left",
		leader: false,
		spriteUrl: playerPair[0].spriteUrl,
		ready: true,
	}

	const rightPlayer: playerInfo = {
		clientId: playerPair[1].id,
		playerName: playerPair[1].username,
		role: "right_player1",
		team: "right",
		leader: false,
		spriteUrl: playerPair[1].spriteUrl,
		ready: true,
	}

	// Create the game room with both players
	const newRoom: Room = {
		id: roomId,
		name: roomName,
		teamSize: 1,
		setting: {
			ballSpeed: 1,
			ballSize: 1,
			paddleSpeed: 1,
			scorePoint: 1,
			map: "stadium"
		},
		gameState: {
			teams: { left: [leftPlayer], right: [rightPlayer] },
			score: { left: 0, right: 0 },
		},
		clients: new Set(),
		clientRoles: new Map<number, playerInfo>([
			[leftPlayer.clientId, leftPlayer],
			[rightPlayer.clientId, rightPlayer],
		]),
		sockets: new Map<WebSocket, number>(),
		chatHistory: [],
		game: pongGame,
		duration: 0,
		canStart: false,
		leaderId: -1,
		private: false,
	};

	rooms.set(roomId, newRoom);

	console.log(`Created game room ${roomName} (${roomId}) for tournament ${tournamentId} with players ${leftPlayer.playerName} and ${rightPlayer.playerName}`);

	return newRoom;
}
