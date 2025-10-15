import { tournaments } from "./tournament.routes";
import { rooms, roomEndGame, generateRoomId, startRoomLoop } from "../room/room";
import { PongGame } from "@shared/game/pong.ts";
import { playerInfo, Room, TournamentLobby } from "../../types/interface";
import WebSocket from "ws";
import { TournamentMatch } from "../../types/interface";
import { createTournament, createTournamentMatch, createTournamentPlayer, updateTournamentPlayerRanking } from "./tournament.service";

// Start tournament countdown and manage tournament progression
export async function startTournamentCountdown(
  tournamentId: number,
  broadcast: (msg: string) => void,
  countdownTime: number,
  client: Map<WebSocket, { tournamentId: number; playerId: number }>
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.countdownTimer || tournament.started) return;

  //create tournament to database
  const TournamentLobbyDb = await createTournament();
  if (TournamentLobbyDb.success && TournamentLobbyDb.data)
          console.log("Tournament created: ", TournamentLobbyDb.data);
  else
  {
      console.log("Tournament creation failed: ", TournamentLobbyDb.error);
      return;
  }

  // Helper function to start the tournament immediately
  const startTournamentNow = () => {
    if (tournament.started) return;
    clearInterval(tournament.countdownTimer);
    tournament.countdownTimer = undefined;
    tournament.countdownRemaining = undefined;
    tournament.started = true;

    // Shuffle players and create matches
    const shuffled = [...tournament.players].sort(() => 0.5 - Math.random());
    const matches: TournamentMatch[] = [];

    for (let i = 0; i < shuffled.length; i += 2) {
      const pair = shuffled.slice(i, i + 2);
      const room = createGameRoom(tournamentId, pair, tournament, TournamentLobbyDb.data);
    //  console.log("Tournament game room created:", room); ////debug

      // Assign WebSocket clients to the game room
      for (const [ws, info] of client.entries()) {
        if (info.tournamentId === tournamentId) {
          const matchPlayer = pair.find(p => p.id === info.playerId);
          if (matchPlayer) {
            room.clients.add(ws);
            room.sockets.set(ws, info.playerId);

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

      matches.push({ roomId: room.id, players: pair, winnerId: -1 });
      startRoomLoop(room);
    }

    // Update tournament and notify clients
    tournament.matches = matches;
    broadcast(JSON.stringify({ type: "tournamentStarted", stage: tournament.stage, matches }));
    console.log(`Tournament ${tournamentId} started with ${tournament.players.length} players`);
  };

  // If countdownTime is 0, start immediately
  if (countdownTime <= 0) {
    startTournamentNow();
    return;
  }

  // Otherwise, run countdown normally
  tournament.countdownRemaining = countdownTime;
  tournament.countdownTimer = setInterval(() => {
    const t = tournaments.get(tournamentId);
    if (!t) return;

    if (t.countdownRemaining! > 0) {
      broadcast(JSON.stringify({ type: "countdown", remaining: t.countdownRemaining }));
      t.countdownRemaining!--;
    } else {
      startTournamentNow();
    }
  }, 1000);

  console.log(`Tournament ${tournamentId} countdown started`);
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
	playerPair: { id: number, username: string, spriteUrl: string }[],
    tournamentInfo: TournamentLobby,
	TournamentLobbyDb: { id: number, status: string, createdAt: Date}
) {
	const roomId = parseInt("1111" + generateRoomId());
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
	  async (winner) => {
		const room = rooms.get(roomId);
		if (!room) return;
		const result = roomEndGame(room, true, winner);
		if (result) {
            console.log ("===============================================");
            console.log ("Game result: ", result);
            console.log ("===============================================");
            await saveMatchResult(result, TournamentLobbyDb, playerPair, tournamentInfo);
            //tournaments.delete(tournamentId);
        }

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

async function saveMatchResult(
    result: { leftPlayerId: number; rightPlayerId: number; scoreLeft: number; scoreRight: number; winnerId: string | number | "draw"; duration: number; },
    TournamentLobbyDb: { id: number, status: string, createdAt: Date},
    playerPair: { id: number, username: string, spriteUrl: string }[],
    tournamentInfo: TournamentLobby
) {
    const createdPlayer: { success: boolean; data?: { id: number, tournamentId: number, userId: number, ranking: number }; error?: string }[] = [];
    for (const player of playerPair) {
        const TournamentPlayer = await createTournamentPlayer({
            tournamentId: TournamentLobbyDb.id,
            userId: parseInt(player.id.toString()),
            ranking: 0,
        });
        if (TournamentPlayer.success && TournamentPlayer.data)
        {
            console.log("Tournament player created: ", TournamentPlayer.data);
            createdPlayer.push({
                success: true,
                data: {
                    ...TournamentPlayer.data,
                    ranking: TournamentPlayer.data.ranking ?? 0 // Ensure ranking is a number
                }
            });
        }
        else
        {
            console.log(`tournament player creation failed: `, TournamentPlayer.error);
            return;
        }
    }
    for (let i = 0; i < createdPlayer.length; i++) {
        const player1 = createdPlayer[i];
        const player2 = createdPlayer[i + 1];
        if (!player2 || !player1) continue;
        const matchResult = await createTournamentMatch({
            tournamentId: TournamentLobbyDb.id,
            round: tournamentInfo?.stage ?? "unknown", // Provide the round value, adjust as needed
            player1Id: player1.data!.id,
            player2Id: player2.data!.id,
            winnerId:
                result.winnerId === "draw"
                    ? -1
                    : result.winnerId === result.leftPlayerId
                        ? player1.data!.id
                        : player2.data!.id,
            player1Score: result.scoreLeft,
            player2Score: result.scoreRight,
        });
        if (matchResult.success && matchResult.data)
            console.log(`tournament match created: `, matchResult.data);
        else
            console.log(`tournament match creation failed: `, matchResult.error);
    }

    //after save match result, update player rank
    const resultCopy = {
        playerId: result.winnerId === "draw" ? null : (typeof result.winnerId === "number" ? result.winnerId : null),
        stage: tournamentInfo.stage,
        scoreLeft: result.scoreLeft,
        scoreRight: result.scoreRight,
        winnerId: result.winnerId === "draw" ? null : (typeof result.winnerId === "number" ? result.winnerId : null),
        duration: result.duration,
    }

    const t = tournaments.get(tournamentInfo.id);
    if (!t) return;

    t.playerMap = t.playerMap || new Map<number, number>();

    for (const p of createdPlayer) {
        if(p.data)
            t.playerMap.set(p.data.userId, p.data.id);
    }

    t.result = t.result || [];
    t.result.push(resultCopy);

    //tournamentInfo.stage === "QF" ? 2 : 0;
    const TotalMatches =
        tournamentInfo.stage === "QF" ? 4 :
        tournamentInfo.stage === "SF" ? 2 :
        tournamentInfo.stage === "F" ? 1 : 0;

    const finishedMatches = t.result.filter(r => r.stage === tournamentInfo.stage).length;

    if (finishedMatches === TotalMatches) {
        console.log(`Tournament ${tournamentInfo.id} stage ${tournamentInfo.stage} completed.`);
        await handleNextRound(t, tournamentInfo.stage);
    }
}

async function handleNextRound(tournament: TournamentLobby, currentStage: "QF" | "SF" | "F") {
    const ThisRoundResult = tournament.result?.filter(r => r.stage === currentStage);
    const winner = [];
    const loser = [];

    for (const match of ThisRoundResult ?? []) {
        const matchInfo = tournament.matches?.find(m =>
            m.players.some(p => p.id === match.winnerId)
        );

        if (!matchInfo || !matchInfo.players[0] || !matchInfo.players[1]) continue;

        const leftId = matchInfo.players[0].id;
        const rightId = matchInfo.players[1].id;

        if (match.winnerId === leftId) {
            winner.push({
                id: leftId,
                username:matchInfo.players[0].username,
                spriteUrl: matchInfo.players[0].spriteUrl
            });
            loser.push({ id: rightId, duration: match.duration });
        } else if (match.winnerId === rightId) {
            winner.push({
                id: rightId,
                username:matchInfo.players[1].username,
                spriteUrl: matchInfo.players[1].spriteUrl
            });
            loser.push({ id: leftId, duration: match.duration });
        }

        loser.sort((a, b) => a.duration - b.duration);

        const stageRankMap = {
            "QF": [5, 8],
            "SF": [3, 4],
            "F": [1, 2],
        };

        const [minRank, maxRank] = stageRankMap[currentStage] ?? [0, 0];
        const rankedLosers = loser.map((p, i) => ({
            playerId: p.id,
            rank: (minRank ?? 0) + i,
        }));

        for (const rl of rankedLosers) {
            if (!tournament.playerMap) return;
            const tournamentPlayerId = tournament.playerMap.get(rl.playerId);
            if (!tournamentPlayerId) {
                console.warn(`No player ID found for user ${rl.playerId}`);
                continue;
            }

            console.log(`Update player id ${tournamentPlayerId} (${rl.playerId}) ranking to ${rl.rank}`);
            await updateTournamentPlayerRanking(rl.rank, tournamentPlayerId);
        }
        //TODO :: handle next round
        //TODO :: current tournament not yet delete
    }
}
