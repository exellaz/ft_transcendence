import { tournaments } from "./tournament.routes";
import { rooms, roomEndGame, generateRoomId, startRoomLoop } from "../room/room";
import { PongGame } from "@shared/game/pong.ts";
import { playerInfo, Room, TournamentLobby } from "../../types/interface";
import WebSocket from "ws";
import { TournamentMatch } from "../../types/interface";
import { createTournament, createTournamentMatch, createTournamentPlayer, updateTournamentPlayerRanking, updateTournamentStatus } from "./tournament.service";

/**
 * @brief Start the countdown for a tournament.
 * @param tournamentId - The ID of the tournament to start the countdown for.
 * @param broadcast - Function to broadcast messages to tournament participants.
 * @param countdownTime - The countdown time in seconds.
 * @param client - Map of WebSocket clients connected to the tournament.
*/
export async function startTournamentCountdown(
  tournamentId: number,
  broadcast: (msg: string) => void,
  countdownTime: number,
  client: Map<WebSocket, { tournamentId: number; playerId: number }>
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.started) return;

  // Prevent concurrent starts: reserve a temporary timer as a lock while async setup runs.
  // We use a placeholder timeout and overwrite it later with the real interval.
  if (tournament.countdownTimer) return;
  const placeholder = setTimeout(() => {}, 0);
  tournament.countdownTimer = placeholder as unknown as NodeJS.Timeout;

  // If anything fails before we set a real timer, clear the placeholder lock.
  const clearPlaceholder = () => {
    try { clearTimeout(placeholder); } catch {}
    tournament.countdownTimer = undefined;
  };

  //store broadcast and client map om tournament so later steps can notify
  tournament.broadcast = broadcast;
  tournament.clientMap = client;

  //create tournament to database
  let TournamentLobbyDb = tournament.tournamentDb;
  if (!TournamentLobbyDb) {
	const create = await createTournament();
	if (create.success && create.data) {
		console.log("[ tournament database ] Tournament created: ", create.data);
		tournament.tournamentDb = create.data;
		TournamentLobbyDb = create.data;
	} else {
		console.log("[ tournament database ] Tournament creation failed: ", create.error);
		clearPlaceholder();
		return;
	}
  } else {
	console.log("[ tournament database ] Reuse tournament DB record: ", TournamentLobbyDb);
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
      const room = createGameRoom(tournamentId, pair, tournament, TournamentLobbyDb);

      if (!room) continue;
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

/**
 * @brief Cancel the ongoing countdown for a tournament.
 * @param tournamentId - The ID of the tournament to cancel the countdown for.
 * @param broadcast - Function to broadcast messages to tournament participants.
 */
export function cancelTournamentCountdown(tournamentId: number, broadcast: (msg: string) => void) {
	const tournament = tournaments.get(tournamentId);
	if (!tournament || !tournament.countdownTimer) return;

	clearInterval(tournament.countdownTimer);
	tournament.countdownTimer = undefined;
	tournament.countdownRemaining = undefined;
	broadcast(JSON.stringify({ type: "countdownCancel" }));
	console.log (`Tournament ${tournamentId} countdown cancelled`); //// debug
}

/**
 * @brief Create a game room for a tournament match.
 * @param tournamentId - The ID of the tournament.
 * @param playerPair - Array of two players participating in the match.
 * @param tournamentInfo - Information about the tournament lobby.
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 * @return The created game room.
*/
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
		scorePoint: 1, //? point to win
		map: "stadium",
	  },
	  async (winner) => {
		const room = rooms.get(roomId);
		if (!room) return;

		const result = roomEndGame(room, true, winner, tournamentId);
		if (result) {
            // console.log ("===============================================");
            // console.log ("Game result: ", result);
            // console.log ("==============================================="); ////debug
            await saveMatchResult(result, TournamentLobbyDb, playerPair, tournamentInfo);
            //tournaments.delete(tournamentId);
        }

    }
  );

  // Ensure both players are defined
  if (!playerPair[0] || !playerPair[1]) return;

	// Define player info for both players
	const leftPlayer: playerInfo = {
		clientId: playerPair[0].id,
		playerName: playerPair[0].username,
		role: "left_player1",
		team: "left",
		leader: false,
		spriteUrl: playerPair[0].spriteUrl,
		ready: true,
		online: true,
	}

	const rightPlayer: playerInfo = {
		clientId: playerPair[1].id,
		playerName: playerPair[1].username,
		role: "right_player1",
		team: "right",
		leader: false,
		spriteUrl: playerPair[1].spriteUrl,
		ready: true,
		online: true,
	}

	// Create the game room with both players and info
	const newRoom: Room = {
		id: roomId,
		name: roomName,
		teamSize: 1,
		setting: {
			ballSpeed: 1,
			ballSize: 1,
			paddleSpeed: 1,
			scorePoint: 5,
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

/**
 * @brief Save the match result to the database and update tournament state.
 * @param result - The result of the match.
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 * @param playerPair - Array of two players who participated in the match.
 * @param tournamentInfo - Information about the tournament lobby.
*/
async function saveMatchResult(
    result: { leftPlayerId: number; rightPlayerId: number; scoreLeft: number; scoreRight: number; winnerId: string | number | "draw"; duration: number; },
    TournamentLobbyDb: { id: number, status: string, createdAt: Date},
    playerPair: { id: number, username: string, spriteUrl: string }[],
    tournamentInfo: TournamentLobby
) {
	const tournament = tournaments.get(tournamentInfo.id);
	if (!tournament) return;
	tournament.playerMap = tournament.playerMap || new Map<number, number>();

	//build createdPlayer array by reusing existing players in playerMap if any
    const createdPlayer: { success: boolean; data?: { id: number, tournamentId: number, userId: number, ranking: number }; error?: string }[] = [];
    for (const player of playerPair) {
		const userId = player.id;

		//if player map has this user, reuse it avoid create tournament player DB again
		const existingTournamentPlayerId = tournament.playerMap.get(userId);
		if (existingTournamentPlayerId) {
			console.log(`[ player tournament DB ]Reusing existing tournament player for user ${userId} with tournament player id ${existingTournamentPlayerId}`);
			createdPlayer.push({
				success: true,
				data: {
					id: existingTournamentPlayerId,
					tournamentId: tournamentInfo.id,
					userId: userId,
					ranking: 0, //ranking will update later
				}
			});
			continue;
		}

		//else create new tournament player DB record
		const TournamentPlayer = await createTournamentPlayer({
            tournamentId: TournamentLobbyDb.id,
            userId: player.id,
            ranking: 0,
        });
        if (TournamentPlayer.success && TournamentPlayer.data)
        {
            console.log("[ player tournament DB ] Tournament player created: ", TournamentPlayer.data);
            createdPlayer.push({
                success: true,
                data: {
                    ...TournamentPlayer.data,
                    ranking: TournamentPlayer.data.ranking ?? 0 // Ensure ranking is a number
                }
            });
			tournament.playerMap.set(userId, TournamentPlayer.data.id);
        }
        else
        {
            console.log(`[ player tournament DB ] tournament player creation failed: `, TournamentPlayer.error);
            return;
        }
    }

	//create match record in database
    for (let i = 0; i < createdPlayer.length; i++) {
        const player1 = createdPlayer[i];
        const player2 = createdPlayer[i + 1];
        if (!player2 || !player1) continue;
        const matchResult = await createTournamentMatch({
            tournamentId: TournamentLobbyDb.id,
            round: tournamentInfo?.stage ?? "unknown",
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

    //after create player and save match result, update player rank
    const resultCopy = {
        playerId: result.winnerId === "draw" ? null : (typeof result.winnerId === "number" ? result.winnerId : null),
        stage: tournamentInfo.stage,
        scoreLeft: result.scoreLeft,
        scoreRight: result.scoreRight,
        winnerId: result.winnerId === "draw" ? null : (typeof result.winnerId === "number" ? result.winnerId : null),
        duration: result.duration,
    }

	//update player map and tournament result
    const t = tournaments.get(tournamentInfo.id);
    if (!t) return;
    t.playerMap = t.playerMap || new Map<number, number>();
    for (const p of createdPlayer) {
        if(p.data)
            t.playerMap.set(p.data.userId, p.data.id);
    }

	//update tournament result
    t.result = [];
    t.result.push(resultCopy);

    //check if need to handle next stage
    const TotalMatches =
        tournamentInfo.stage === "QF" ? 4 :
        tournamentInfo.stage === "SF" ? 2 :
        tournamentInfo.stage === "F" ? 1 : 0;
    const finishedMatches = t.result.filter(r => r.stage === tournamentInfo.stage).length;
    if (finishedMatches === TotalMatches) {
        console.log(`Tournament ${tournamentInfo.id} stage ${tournamentInfo.stage} completed.`);
        await handleNextRound(tournamentInfo.id, tournamentInfo.stage, TournamentLobbyDb);
    }
}

/**
 * @brief Handle the transition to the next round of the tournament.
 * @param tournamentId - The ID of the tournament.
 * @param currentStage - The current stage of the tournament ("QF", "SF", "F").
 * @param TournamentLobbyDb - Database record of the tournament lobby.
*/
async function handleNextRound(tournamentId: number, currentStage: "QF" | "SF" | "F", TournamentLobbyDb: { id: number, status: string, createdAt: Date }) {
    const tournament = tournaments.get(tournamentId);
    if (!tournament) return;

	//collect winners and losers and results from current stage
    const ThisRoundResult = tournament.result?.filter(r => r.stage === currentStage);
    const winners: { id: number; username: string; spriteUrl: string; ready: boolean }[] = [];
    const losers: { id: number; duration: number }[] = [];

    // collect winners and losers from current stage
    for (const match of ThisRoundResult ?? []) {
        const matchInfo = tournament.matches?.find(m =>
            m.players.some(p => p.id === match.winnerId)
        );
        if (!matchInfo || !matchInfo.players[0] || !matchInfo.players[1]) continue;
        const leftId = matchInfo.players[0].id;
        const rightId = matchInfo.players[1].id;
        if (match.winnerId === leftId) {
            winners.push({
                id: leftId,
                username: matchInfo.players[0].username,
                spriteUrl: matchInfo.players[0].spriteUrl,
                ready: false,
            });
            losers.push({ id: rightId, duration: match.duration ?? 0 });
        } else if (match.winnerId === rightId) {
            winners.push({
                id: rightId,
                username: matchInfo.players[1].username,
                spriteUrl: matchInfo.players[1].spriteUrl,
                ready: false,
            });
            losers.push({ id: leftId, duration: match.duration ?? 0 });
        }
    }

    // now compute ranks for losers (after collecting)
    losers.sort((a, b) => a.duration - b.duration);
    const stageRankMap: Record<string, [number, number]> = {
        "QF": [5, 8],
        "SF": [3, 4],
        "F": [2, 2],
    };
    const minRank = stageRankMap[currentStage] ?? [0, 0];
    const loserStartRank = minRank[0] || 0;

	// assign ranks to losers
    const rankedLosers = losers.map((p, i) => ({
        playerId: p.id,
        rank: loserStartRank + i,
    }));

    //update the loser rankings in database before proceeding to next stage
    const updatePromises = rankedLosers.map(async (rl) => {
        if (!tournament.playerMap) {
            console.warn(`No playerMap for tournament ${tournamentId}; cannot update ranking for ${rl.playerId}`);
            return;
        }
        const tournamentPlayerId = tournament.playerMap.get(rl.playerId);
        if (!tournamentPlayerId) {
            console.warn(`No tournament player id for user ${rl.playerId} in tournament ${tournamentId}`);
            return;
        }
        console.log(`Update player id ${tournamentPlayerId} (${rl.playerId}) ranking to ${rl.rank}`);
        return updateTournamentPlayerRanking(rl.rank, tournamentPlayerId);
    });

    await Promise.all(updatePromises);

    //handle next stage
    const nextStageMap: Record<string, string | null> = { "QF": "SF", "SF": "F", "F": null };
    const nextStage = nextStageMap[currentStage];

    // If this was the final (no nextStage), update the rank of the winners
    if (!nextStage) {
      const winnerRankPromises = winners.map(async (w, idx) => {
        if (!tournament.playerMap) return;
        const tournamentPlayerId = tournament.playerMap.get(w.id);
        if (!tournamentPlayerId) {
          console.warn(`No tournament player id for winner ${w.id} in tournament ${tournamentId}`);
          return;
        }
        const winnerRank = idx + 1; // first winner = 1
        console.log(`Update winner id ${tournamentPlayerId} (${w.id}) ranking to ${winnerRank}`);
        return updateTournamentPlayerRanking(winnerRank, tournamentPlayerId);
      });
      await Promise.all(winnerRankPromises);
    }

    // If no next stage, finalize tournament
    if (!nextStage) {
        const winnerIds = winners.map((w) => w.id);
        tournament.players = winners;
        tournament.matches = [];
        tournament.result = tournament.result?.filter((r) => r.stage !== currentStage) ?? [];
        tournament.started = false;

        // reset client map so only winners' sockets get registered when they reconnect or are transferred
        tournament.clientMap = new Map<WebSocket, { tournamentId: number; playerId: number }>();
        // record allowed players so WS can reject eliminated re-joins
        tournament.allowedPlayers = new Set<number>(winnerIds);

        console.log(`Tournament ${tournamentId} prepared NEW lobby for stage ${nextStage} with players:`, winnerIds);

        // notify winners / clients
        const bc = tournament.broadcast;
        if (typeof bc === "function") {
          bc(JSON.stringify({
            type: "tournamentNewLobby",
            tournamentId,
            nextStage,
            players: winners,
            maxPlayer: tournament.maxPlayer ?? winners.length,
          }));
        }

        console.log(`Tournament ${tournamentId} completed.`);
        const updateTournamentDB = await updateTournamentStatus("COMPLETED", TournamentLobbyDb.id);
        if (updateTournamentDB.success)
            console.log("[ update tournament DB ] Tournament status updated to COMPLETED: ", updateTournamentDB.data);
        else
            console.log("[ update tournament DB ] Tournament status update failed: ", updateTournamentDB.error);
        console.log(`[ update tournament DB ] Deleting tournament ${tournamentId} from memory.`);
        tournaments.delete(tournamentId);
        return;
    }

    // --- IMPORTANT: create a NEW clean lobby for next round ---
    const winnerIds = winners.map((w) => w.id);
    tournament.stage = nextStage as "SF" | "F";
    tournament.players = winners;                 // replace players with winners only
    tournament.matches = [];
    tournament.result = tournament.result?.filter((r) => r.stage !== currentStage) ?? [];
    tournament.started = false;

    // reset client map so only winners' sockets get registered when they reconnect or are transferred
    tournament.clientMap = new Map<WebSocket, { tournamentId: number; playerId: number }>();
    // record allowed players so WS can reject eliminated re-joins
    tournament.allowedPlayers = new Set<number>(winnerIds);

    console.log(`Tournament ${tournamentId} prepared NEW lobby for stage ${nextStage} with players:`, winnerIds);

    // notify winners / clients
    const bc = tournament.broadcast;
    if (typeof bc === "function") {
      bc(JSON.stringify({
        type: "tournamentNewLobby",
        tournamentId,
        nextStage,
        players: winners,
        maxPlayer: tournament.maxPlayer ?? winners.length,
      }));
    }
    return;
  }
