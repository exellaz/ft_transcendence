import { tournaments, generateTournamentId } from "./tournament.routes";
import { rooms, roomEndGame, generateRoomId } from "../room/room";
import { PongGame } from "@shared/game/pong.ts";
import {
  PlacementEntry,
  playerInfo,
  Room,
  TournamentLobby,
  TournamentMatch,
  TournamentPlayerWs,
} from "../../types/interface";
import WebSocket from "ws";
import {
  createTournament,
  createTournamentMatch,
  createTournamentPlayer,
  updateTournamentPlayerRanking,
  updateTournamentStatus,
} from "./tournament.service";

/**
 * @brief Add a winner to the next tournament's expected players list
 * @param currentTournamentId - The ID of the current tournament
 * @param winnerId - The ID of the winner to add to next tournament
 */
export function addWinnerToNextTournament(
  currentTournamentId: number,
  winnerId: number,
) {
  const currentTournament = tournaments.get(currentTournamentId);
  if (!currentTournament) return;

  // Get or create the next tournament
  let nextTournamentId = currentTournament.nextTournamentId;
  if (!nextTournamentId) {
    console.log(
      `[Tournament ${currentTournamentId}] No next tournament created yet for winner ${winnerId}`,
    );
    return;
  }

  const nextTournament = tournaments.get(nextTournamentId);
  if (!nextTournament) {
    console.warn(
      `[Tournament ${currentTournamentId}] Next tournament ${nextTournamentId} not found`,
    );
    return;
  }

  // Initialize allowedPlayers and nextStageExpectedPlayers if needed
  if (!nextTournament.allowedPlayers) {
    nextTournament.allowedPlayers = new Set<number>();
  }
  if (!nextTournament.nextStageExpectedPlayers) {
    nextTournament.nextStageExpectedPlayers = [];
  }

    // ✅ NEW: Store winner's full info for later reference
  if (!nextTournament.expectedPlayerInfo) {
    nextTournament.expectedPlayerInfo = new Map();
  }

  // Find winner's info from current tournament
  const winnerInfo = currentTournament.players.find(p => p.id === winnerId);
  if (winnerInfo) {
    nextTournament.expectedPlayerInfo.set(winnerId, {
      id: winnerInfo.id,
      username: winnerInfo.username,
      spriteUrl: winnerInfo.spriteUrl,
    });
    console.log(
      `[Tournament ${nextTournamentId}] Stored info for winner ${winnerId}: ${winnerInfo.username}`,
    );
  }

  // Add winner to allowed players
  nextTournament.allowedPlayers.add(winnerId);
  if (!nextTournament.nextStageExpectedPlayers.includes(winnerId)) {
    nextTournament.nextStageExpectedPlayers.push(winnerId);
  }

  console.log(
    `[Tournament ${nextTournamentId}] Added winner ${winnerId} to expected players. Current: ${Array.from(nextTournament.allowedPlayers).join(", ")}`,
  );

  // ✅ ONLY start timeout on FIRST winner AND if timeout not already running
  const allAllowedPlayer = nextTournament.allowedPlayers.size === nextTournament.maxPlayer;
  const timeoutNotStarted = !nextTournament.lobbyTimeout && !nextTournament.lobbyTimeoutStarted;

  // If this is the first winner, start the lobby timeout
  if (allAllowedPlayer && timeoutNotStarted) {
    const expectedPlayerCount = nextTournament.maxPlayer;
    const timeoutSeconds = 30;
    nextTournament.lobbyTimeoutStarted = true; // Mark that timeout has started
    console.log(
      `[Tournament ${nextTournamentId}] collected all winners. Starting ${timeoutSeconds}s timeout for ${expectedPlayerCount} players`,
    );
    startLobbyTimeout(nextTournamentId, expectedPlayerCount, timeoutSeconds);
  } else {
    console.log(
      `[Tournament ${nextTournamentId}] Winner added, timeout already running (started: ${nextTournament.lobbyTimeoutStarted})`,
    );
  }
}

/**
 * @brief Start a timeout timer for tournament lobby to handle no-show players
 * @param tournamentId - The ID of the tournament
 * @param expectedPlayerCount - Number of players expected in the lobby
 * @param timeoutSeconds - Timeout duration in seconds (default: 60)
 */
export function startLobbyTimeout(
  tournamentId: number,
  expectedPlayerCount: number,
  timeoutSeconds: number,
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  // ✅ Don't restart if already running
  if (tournament.lobbyTimeout) {
    console.log(`[Tournament ${tournamentId}] ⚠️ Timeout already running, NOT restarting`);
    return;
  }

  const startTime = Date.now();
  const expectedEndTime = startTime + (timeoutSeconds * 1000);

  console.log(
    `[Tournament ${tournamentId}] ⏰ Starting ${timeoutSeconds}s timeout`,
    `\n  Start: ${new Date(startTime).toISOString()}`,
    `\n  End:   ${new Date(expectedEndTime).toISOString()}`,
  );

  // Start new timeout
  tournament.lobbyTimeout = setTimeout(async () => {
    const actualEndTime = Date.now();
    const actualDuration = (actualEndTime - startTime) / 1000;

    console.log(
      `[Tournament ${tournamentId}] ⏰ Timeout FIRED after ${actualDuration.toFixed(2)}s (expected ${timeoutSeconds}s)`,
      `\n  Expected: ${new Date(expectedEndTime).toISOString()}`,
      `\n  Actual:   ${new Date(actualEndTime).toISOString()}`,
    );

    const t = tournaments.get(tournamentId);
    if (!t || t.lock) return;

    const currentPlayerCount = t.players.length;
    const missingPlayerCount = expectedPlayerCount - currentPlayerCount;

    console.log(
      `[Tournament ${tournamentId}] Stage: ${t.stage}, Expected: ${expectedPlayerCount}, Current: ${currentPlayerCount}, Missing: ${missingPlayerCount}`,
    );

    // ✅ SPECIAL CASE: Semi-finals with only 1 or 2 real players
    if (t.stage === "SF" && expectedPlayerCount === 4) {
      await handleSemiFinalSpecialCases(tournamentId, t, currentPlayerCount, expectedPlayerCount);
      return;
    }

    if (missingPlayerCount > 0) {
      await createDummiesForAFK(tournamentId, t, expectedPlayerCount, missingPlayerCount);
    }

    // ✅ Clear the timeout reference and flag
    t.lobbyTimeout = undefined;
    t.lobbyTimeoutStarted = false;
  }, timeoutSeconds * 1000);
}

/**
 * @brief Handle special cases in semi-finals when only 1 or 2 players show up
 */
async function handleSemiFinalSpecialCases(
  tournamentId: number,
  tournament: TournamentLobby,
  currentPlayerCount: number,
  expectedPlayerCount: number,
) {
  const expectedPlayers = Array.from(tournament.allowedPlayers || []);
  const currentPlayerIds = tournament.players.map((p) => p.id);
  const noShowPlayers = expectedPlayers.filter(
    (id) => !currentPlayerIds.includes(id),
  );

  console.log(
    `[Tournament ${tournamentId}] Semi-final special case: ${currentPlayerCount} players showed up`,
  );

  // ✅ Initialize playerMap if needed
  if (!tournament.playerMap) {
    tournament.playerMap = new Map();
  }

  // ✅ CASE 1: Only 1 player showed up - they win, others get random ranks 2-4
  if (currentPlayerCount === 1) {
    const winner = tournament.players[0];
    if (!winner) {
        console.error(`[Tournament ${tournamentId}] No players found despite count 1`);
        return;
    }

    console.log(
      `[Tournament ${tournamentId}] Only 1 player (${winner.username}) in semi-finals. Awarding 1st place.`,
    );

    // ✅ Ensure winner has tournament player record
    let winnerTournamentPlayerId = tournament.playerMap.get(winner.id);
    if (!winnerTournamentPlayerId && tournament.tournamentDb) {
      console.log(`[Tournament ${tournamentId}] Creating tournament player record for winner ${winner.id}`);
      const createResult = await createTournamentPlayer({
        tournamentId: tournament.tournamentDb.id,
        userId: winner.id,
        ranking: 0,
      });
      if (createResult.success && createResult.data) {
        winnerTournamentPlayerId = createResult.data.id;
        tournament.playerMap.set(winner.id, winnerTournamentPlayerId);
        console.log(`[Tournament ${tournamentId}] Created tournament player ID ${winnerTournamentPlayerId} for winner ${winner.id}`);
      } else {
        console.error(`[Tournament ${tournamentId}] Failed to create tournament player for winner:`, createResult.error);
      }
    }

    // Update winner's rank
    if (winnerTournamentPlayerId) {
      const updateResult = await updateTournamentPlayerRanking(1, winnerTournamentPlayerId);
      if (updateResult.success) {
        tournament.rankUpdatedPlayers?.add(winner.id);
        console.log(`[Tournament ${tournamentId}] ✅ Awarded ${updateResult.data?.ranking} to ${winner.username}`);
      } else {
        console.error(`[Tournament ${tournamentId}] Failed to update winner rank:`, updateResult.error);
      }
    }

    //get random ranks 2, 3, 4 for afk player
    const AFKRanks = [2, 3, 4];

    for (let i = 0; i < noShowPlayers.length && i < AFKRanks.length; i++) {
      const playerId = noShowPlayers[i];
      const rank = AFKRanks[i];
      if (!playerId || !rank) continue;

      console.log(`[Tournament ${tournamentId}] Processing AFK player ${playerId} for rank ${rank}`);

      // Check if tournament player record exists
      let tournamentPlayerId = tournament.playerMap.get(playerId);

      // If not, create it
      if (!tournamentPlayerId && tournament.tournamentDb) {
        const createResult = await createTournamentPlayer({
          tournamentId: tournament.tournamentDb.id,
          userId: playerId,
          ranking: 0,
        });

        if (createResult.success && createResult.data) {
          tournamentPlayerId = createResult.data.id;
          tournament.playerMap.set(playerId, tournamentPlayerId);
          console.log(`[Tournament ${tournamentId}] ✅ Created tournament player ID ${tournamentPlayerId} for AFK player ${playerId}`);
        } else {
          console.error(`[Tournament ${tournamentId}] ❌ Failed to create tournament player for AFK ${playerId}:`, createResult.error);
          continue;
        }
      } else if (tournamentPlayerId) {
        console.log(`[Tournament ${tournamentId}] Tournament player record already exists: ${tournamentPlayerId} for user ${playerId}`);
      }

      // Update the rank
      if (tournamentPlayerId) {
        console.log(`[Tournament ${tournamentId}] Updating rank ${rank} for tournament player ID ${tournamentPlayerId} (user ${playerId})`);
        const updateResult = await updateTournamentPlayerRanking(rank, tournamentPlayerId);
        if (updateResult.success) {
          tournament.rankUpdatedPlayers?.add(playerId);
          console.log(`[Tournament ${tournamentId}] ✅ Awarded rank ${updateResult.data?.ranking} to AFK player ${playerId}`);
        } else {
          console.error(`[Tournament ${tournamentId}] ❌ Failed to update rank for player ${playerId}:`, updateResult.error);
        }
      } else {
        console.error(`[Tournament ${tournamentId}] ❌ No tournament player ID available for user ${playerId}`);
      }
    }

    // End the tournament
    tournament.lock = true;

    if (tournament.tournamentDb) {
      const updateResult = await updateTournamentStatus("COMPLETED", tournament.tournamentDb.id);
      if (updateResult.success) {
        console.log(`[Tournament ${tournamentId}] Tournament status updated to COMPLETED: `, updateResult.data);
      } else {
        console.error(`[Tournament ${tournamentId}] Failed to update tournament status:`, updateResult.error);
      }
    }

    // ✅ Send winner to results page
    if (tournament.clientMap) {
      for (const [ws, info] of tournament.clientMap.entries()) {
        if (info.playerId === winner.id && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(
              JSON.stringify({
                type: "semiFinalEnd",
                winnerRank: 1,
                clientId: winner.id,
                lastTournamentId: tournamentId,
                tournamentDb: tournament.tournamentDb?.id,
              }),
            );
            console.log(`[Tournament ${tournamentId}] Sent tournament end message to winner ${winner.id}`);
          } catch (err) {
            console.error(`[Tournament ${tournamentId}] Failed to send message to winner:`, err);
          }
        }
      }
    }

    // Clean up
    tournament.rankUpdatedPlayers?.clear();
    tournaments.delete(tournamentId);
    return;
  }

  // ✅ CASE 2: Only 2 players showed up - promote to finals, others get random ranks 3-4
  if (currentPlayerCount === 2) {
    console.log(
      `[Tournament ${tournamentId}] Only 2 players in semi-finals. Promoting to finals.`,
    );

    // Check if next tournament already exists, if not create it
    let finalTournamentId = tournament.nextTournamentId;

    if (!finalTournamentId) {
      // Create finals tournament manually
      finalTournamentId = generateTournamentId();

            // ✅ Create broadcast function for finals
      const finalsBroadcast = (msg: string) => {
        const finalTournament = tournaments.get(finalTournamentId!);
        if (!finalTournament?.clientMap) return;

        for (const [ws, info] of finalTournament.clientMap.entries()) {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(msg);
            } catch (err) {
              console.error(`[Tournament ${finalTournamentId}] Failed to broadcast to player ${info.playerId}:`, err);
            }
          }
        }
      };

      const finalTournament: TournamentLobby = {
        id: finalTournamentId,
        name: `Tournament Finals ${finalTournamentId}`,
        players: [],
        lock: false,
        stage: "F",
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: 2,
        tournamentDb: tournament.tournamentDb,
        allowedPlayers: new Set<number>(),
        nextStageExpectedPlayers: [],
        parentTournamentId: tournamentId,
        expectedPlayerInfo: new Map(),
        clientMap: new Map(),
        playerMap: tournament.playerMap,
        rankUpdatedPlayers: tournament.rankUpdatedPlayers,
        broadcast: finalsBroadcast, // ✅ Set broadcast function
      };

      tournaments.set(finalTournamentId, finalTournament);
      tournament.nextTournamentId = finalTournamentId;

      console.log(
        `[Tournament ${finalTournamentId}] Created finals tournament`,
      );
    }

    const finalTournament = tournaments.get(finalTournamentId);
    if (!finalTournament) {
      console.error(`[Tournament ${tournamentId}] Failed to get finals tournament`);
      return;
    }

    // Add both players to finals
    for (const player of tournament.players) {
      addWinnerToNextTournament(tournamentId, player.id);
      console.log(`[Tournament ${tournamentId}] Promoted ${player.username} to finals`);
    }

    // No-shows get random ranks 3, 4
    const noShowRanks = [3, 4];

    for (let i = 0; i < noShowPlayers.length && i < noShowRanks.length; i++) {
      const playerId = noShowPlayers[i];
      const rank = noShowRanks[i];
      if (!playerId || !rank) continue;
      const tournamentPlayerId = tournament.playerMap?.get(playerId);

      if (tournamentPlayerId) {
        await updateTournamentPlayerRanking(rank, tournamentPlayerId);
        tournament.rankUpdatedPlayers?.add(playerId);
        console.log(`[Tournament ${tournamentId}] Awarded rank ${rank} to no-show player ${playerId}`);
      }
    }

    // Lock this stage and notify players
    tournament.lock = true;

    // ✅ Transfer WebSocket connections from semi-finals to finals
    if (tournament.clientMap) {
      for (const [ws, info] of tournament.clientMap.entries()) {
        // Only transfer players who advanced (not dummies)
        if (tournament.players.some(p => p.id === info.playerId)) {
          console.log(`[Tournament ${tournamentId}] Transferring player ${info.playerId} WebSocket to finals`);

          // Add to finals client map
          finalTournament.clientMap?.set(ws, {
            tournamentId: finalTournamentId,
            playerId: info.playerId,
          });

          // ✅ Send redirect message to client
          ws.send(
            JSON.stringify({
              type: "redirectToFinals",
              nextTournamentId: finalTournamentId,
              stage: "F",
            }),
          );
        }
      }
    }

    tournament.lock = true;

    console.log(`[Tournament ${tournamentId}] Semi-finals completed with 2 players advancing to finals`);
    return;
  }

  // ✅ CASE 3: 3 players showed up - create 1 dummy for matchmaking
  if (currentPlayerCount === 3) {
    console.log(
      `[Tournament ${tournamentId}] 3 players in semi-finals. Creating 1 dummy.`,
    );
    await createDummiesForAFK(tournamentId, tournament, expectedPlayerCount, 1);
    return;
  }
}

/**
 * @brief Create dummy players for AFK
 */
async function createDummiesForAFK(
  tournamentId: number,
  tournament: TournamentLobby,
  expectedPlayerCount: number,
  missingPlayerCount: number,
) {
  const expectedPlayers = Array.from(tournament.allowedPlayers || []);
  const currentPlayerIds = tournament.players.map((p) => p.id);
  const AFKPlayers = expectedPlayers.filter(
    (id) => !currentPlayerIds.includes(id),
  );

  console.log(`[Tournament ${tournamentId}] Creating ${missingPlayerCount} dummies for: ${AFKPlayers.join(", ")}`);

  for (const AFKPlayerId of AFKPlayers.slice(0, missingPlayerCount)) {
    let playerInfo = tournament.expectedPlayerInfo?.get(AFKPlayerId);

    if (!playerInfo && tournament.parentTournamentId) {
      const parentTournament = tournaments.get(tournament.parentTournamentId);
      if (parentTournament) {
        const parentPlayer = parentTournament.players.find(
          (p) => p.id === AFKPlayerId,
        );
        if (parentPlayer) {
          playerInfo = {
            id: parentPlayer.id,
            username: parentPlayer.username,
            spriteUrl: parentPlayer.spriteUrl,
          };
        }
      }
    }

    const dummyPlayer: TournamentPlayerWs = {
      id: AFKPlayerId,
      username: playerInfo
        ? `[Forfeited] ${playerInfo.username}`
        : `[Forfeited] Player ${AFKPlayerId}`,
      spriteUrl:
        playerInfo?.spriteUrl ||
        "/assets/skins/slime/red/idle.png",
      ready: true,
    };

    tournament.players.push(dummyPlayer);

    if (!tournament.dummyPlayers) {
      tournament.dummyPlayers = new Set();
    }
    tournament.dummyPlayers.add(AFKPlayerId);

    console.log(
      `[Tournament ${tournamentId}] ✅ Created dummy: ${dummyPlayer.username}`,
    );
  }

  // Broadcast updated player list
  if (tournament.broadcast) {
    tournament.broadcast(
      JSON.stringify({
        type: "playerJoined",
        players: tournament.players,
      }),
    );
  }

  // Start countdown if lobby is full
  if (
    tournament.players.length === tournament.maxPlayer &&
    tournament.broadcast &&
    tournament.clientMap &&
    !tournament.lock
  ) {
    console.log(
      `[Tournament ${tournamentId}] ✅ Lobby full, starting countdown`,
    );
    startTournamentCountdown(tournamentId, tournament.broadcast, 10, tournament.clientMap);
  }
}

/**
 * @brief Assign rank to no-show player based on tournament stage
 * @param tournamentId - The ID of the tournament
 * @param playerId - The player who didn't show up
 * @param stage - Current tournament stage
 */
//async function assignNoShowRank(
//  tournamentId: number,
//  playerId: number,
//  stage: "QF" | "SF" | "F",
//) {
//  const tournament = tournaments.get(tournamentId);
//  if (!tournament || !tournament.playerMap) return;

//  // Determine rank based on stage (lowest rank in that stage)
//  const stageRankMap: Record<"QF" | "SF" | "F", number> = {
//    QF: 8, // Quarterfinals no-show: 8th place
//    SF: 4, // Semifinals no-show: 4th place
//    F: 2, // Finals no-show: 2nd place (runner-up)
//  };

//  const rank = stageRankMap[stage];
//  const tournamentPlayerId = tournament.playerMap.get(playerId);

//  if (tournamentPlayerId) {
//    const result = await updateTournamentPlayerRanking(rank, tournamentPlayerId);
//    if (result.success) {
//      console.log(
//        `[Tournament ${tournamentId}] Assigned rank ${rank} to no-show player ${playerId}`,
//      );
//      tournament.rankUpdatedPlayers?.add(playerId);
//    } else {
//      console.error(
//        `[Tournament ${tournamentId}] Failed to assign rank to no-show player ${playerId}:`,
//        result.error,
//      );
//    }
//  }
//}

/**
 * @brief Cancel lobby timeout
 * @param tournamentId - The ID of the tournament
 */
export function cancelLobbyTimeout(tournamentId: number) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  if (tournament.lobbyTimeout) {
    clearTimeout(tournament.lobbyTimeout);
    tournament.lobbyTimeout = undefined;
    tournament.lobbyTimeoutStarted = false; // Reset the started flag
    console.log(`[Tournament ${tournamentId}] Lobby timeout cancelled`);
  }
}

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
  client: Map<WebSocket, { tournamentId: number; playerId: number }>,
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || tournament.lock) return;

  // Prevent concurrent starts: reserve a temporary timer as a lock while async setup runs.
  // We use a placeholder timeout and overwrite it later with the real interval.
  if (tournament.countdownTimer) return;
  const placeholder = setTimeout(() => {}, 0);
  tournament.countdownTimer = placeholder as unknown as NodeJS.Timeout;

  // If anything fails before we set a real timer, clear the placeholder lock.
  const clearPlaceholder = () => {
    try {
      clearTimeout(placeholder);
    } catch {}
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
      console.log("[tournament database] Tournament created: ", create.data);
      tournament.tournamentDb = create.data;
      TournamentLobbyDb = create.data;
    } else {
      console.log(
        "[tournament database] Tournament creation failed: ",
        create.error,
      );
      clearPlaceholder();
      return;
    }
  } else {
    console.log(
      "[tournament database] Reuse tournament DB record: ",
      TournamentLobbyDb,
    );
  }

  // Helper function to start the tournament immediately
  const startTournamentNow = () => {
    if (tournament.lock) return;
    clearInterval(tournament.countdownTimer);
    tournament.countdownTimer = undefined;
    tournament.countdownRemaining = undefined;
    tournament.lock = true;

    const shuffled = [...tournament.players].sort(() => 0.5 - Math.random());
    const matches: TournamentMatch[] = [];

    //shuffle players and pair them into match rooms
    for (let i = 0; i < shuffled.length; i += 2) {
      const pair = shuffled.slice(i, i + 2);
      const room = createGameRoom(
        tournamentId,
        pair,
        tournament,
        TournamentLobbyDb,
      );

      if (!room) continue;
      //  console.log("Tournament game room created:", room); ////debug

      // Assign WebSocket clients to the game room
      for (const [ws, info] of client.entries()) {
        if (info.tournamentId === tournamentId) {
          const matchPlayer = pair.find((p) => p.id === info.playerId);
          if (matchPlayer) {
            room.clients.add(ws);
            room.sockets.set(ws, info.playerId);

            //get player team info and send to client
            const playerInfo = room.clientRoles.get(info.playerId);
            if (playerInfo) {
              ws.send(
                JSON.stringify({
                  type: "getPlayerTeam",
                  roomId: room.id,
                  roomName: tournament.stage,
                  team: playerInfo.team === "left" ? "left" : "right",
                }),
              );
            }

            //assign a pair of players to match room
            ws.send(
              JSON.stringify({
                type: "matchAssigned",
                roomId: room.id,
                stage: tournament.stage,
                players: pair,
              }),
            );
          }
        }
      }
      matches.push({ roomId: room.id, players: pair, winnerId: -1 });
    }
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
      broadcast(
        JSON.stringify({ type: "countdown", remaining: t.countdownRemaining }),
      );
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
export function cancelTournamentCountdown(
  tournamentId: number,
  broadcast: (msg: string) => void,
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament || !tournament.countdownTimer) return;

  clearInterval(tournament.countdownTimer);
  tournament.countdownTimer = undefined;
  tournament.countdownRemaining = undefined;
  broadcast(JSON.stringify({ type: "countdownCancel" }));
  console.log(`Tournament ${tournamentId} countdown cancelled`); //// debug
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
  playerPair: { id: number; username: string; spriteUrl: string }[],
  tournamentInfo: TournamentLobby,
  TournamentLobbyDb: { id: number; status: string; createdAt: Date },
) {
  const roomId = parseInt("1111" + generateRoomId());
  const roomName = `Tournament ${tournamentId} - Room ${roomId}`;

  if (!playerPair[0] || !playerPair[1]) {
    console.error(`Invalid player pair: ${JSON.stringify(playerPair)}`);
    return;
  }
  const tournament = tournaments.get(tournamentId);
  const isDummyLeft = tournament?.dummyPlayers?.has(playerPair[0].id) || false;
  const isDummyRight = tournament?.dummyPlayers?.has(playerPair[1].id) || false;

  // Initialize Pong game instance
  const pongGame = new PongGame(
    false,
    {
      ballSpeed: 1,
      ballSize: 1,
      paddleSpeed: 1,
      scorePoint: 3, //? point to win
      map: "stadium",
    },
    async (winner) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const result = roomEndGame(room, true, winner, tournamentId);
      if (result) {
        console.log("===============================================");
        console.log("Game result: ", result);
        console.log("==============================================="); ////debug
        await saveMatchResult(
          result,
          TournamentLobbyDb,
          playerPair,
          tournamentInfo,
        );
      }
    },
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
    ready: isDummyLeft,
    online: !isDummyLeft,
  };

  const rightPlayer: playerInfo = {
    clientId: playerPair[1].id,
    playerName: playerPair[1].username,
    role: "right_player1",
    team: "right",
    leader: false,
    spriteUrl: playerPair[1].spriteUrl,
    ready: isDummyRight,
    online: !isDummyRight,
  };

  // Create the game room with both players and info
  const newRoom: Room = {
    id: roomId,
    name: roomName,
    teamSize: 1,
    setting: {
      ballSpeed: 1,
      ballSize: 1,
      paddleSpeed: 1,
      scorePoint: 3,
      map: "stadium",
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
    inGame: false,
  };

  rooms.set(roomId, newRoom);

  // ✅ Handle dummy scenarios
  if (isDummyLeft && isDummyRight) {
    // Both players are dummies - end immediately as draw
    console.log(`[Tournament ${tournamentId}] Both players are dummies in room ${roomId}. Ending as draw.`);
    setTimeout(async () => {
      const result = roomEndGame(newRoom, true, "draw", tournamentId);
      if (result) {
        await saveMatchResult(result, TournamentLobbyDb, playerPair, tournamentInfo);
      }
    }, 1000);
  }

  console.log(
    `Created game room ${roomName} (${roomId}) for tournament ${tournamentId} with players ${leftPlayer.playerName} and ${rightPlayer.playerName}`,
  );
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
  result: {
    leftPlayerId: number;
    rightPlayerId: number;
    scoreLeft: number;
    scoreRight: number;
    winnerId: string | number | "draw";
    duration: number;
    rank?: number | undefined;
  },
  TournamentLobbyDb: { id: number; status: string; createdAt: Date },
  playerPair: { id: number; username: string; spriteUrl: string }[],
  tournamentInfo: TournamentLobby,
) {
  const tournament = tournaments.get(tournamentInfo.id);
  if (!tournament) return;
  tournament.playerMap = tournament.playerMap || new Map<number, number>();

  // ✅ Initialize tracking set for players whose rank has been updated
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  //build createdPlayer array by reusing existing players in playerMap if any
  const createdPlayer: {
    success: boolean;
    data?: {
      id: number;
      tournamentId: number;
      userId: number;
      ranking: number;
    };
    error?: string;
  }[] = [];
  for (const player of playerPair) {
    const userId = player.id;

    //if player map has this user, reuse it avoid create tournament player DB again
    const existingTournamentPlayerId = tournament.playerMap.get(userId);
    if (existingTournamentPlayerId) {
      console.log(
        `[tournament player database] Reusing existing tournament player for user ${userId} with tournament player id ${existingTournamentPlayerId}`,
      );
      createdPlayer.push({
        success: true,
        data: {
          id: existingTournamentPlayerId,
          tournamentId: tournamentInfo.id,
          userId: userId,
          ranking: 0, //ranking will update later
        },
      });
      continue;
    }

    //else create new tournament player DB record
    const TournamentPlayer = await createTournamentPlayer({
      tournamentId: TournamentLobbyDb.id,
      userId: player.id,
      ranking: 0,
    });
    if (TournamentPlayer.success && TournamentPlayer.data) {
      console.log(
        "[tournament player database] Tournament player created: ",
        TournamentPlayer.data,
      );
      createdPlayer.push({
        success: true,
        data: {
          ...TournamentPlayer.data,
          ranking: TournamentPlayer.data.ranking ?? 0,
        },
      });
      tournament.playerMap.set(userId, TournamentPlayer.data.id);
    } else {
      console.log(
        `[tournament player database] tournament player creation failed: `,
        TournamentPlayer.error,
      );
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
      console.log(`[tournament match database] created: `, matchResult.data);
    else
      console.log(
        `[tournament match database] creation failed: `,
        matchResult.error,
      );
  }

  // ✅ NEW: Create next tournament if this is the first match to finish
  const isFirstMatchOfStage = !tournament.result || tournament.result.length === 0;
  const shouldCreateNextTournament =
    isFirstMatchOfStage &&
    (tournamentInfo.stage === "QF" || tournamentInfo.stage === "SF");

  if (shouldCreateNextTournament && !tournament.nextTournamentId) {
    const nextStageMap: Record<string, "SF" | "F" | null> = {
      QF: "SF",
      SF: "F",
      F: null,
    };
    const nextStage = nextStageMap[tournamentInfo.stage];

    if (nextStage) {
      console.log(
        `[Tournament ${tournamentInfo.id}] Creating next tournament for stage ${nextStage}`,
      );

      const nextTournamentId = generateTournamentId();
      const nextTournament: TournamentLobby = {
        id: nextTournamentId,
        name: `Tournament ${nextTournamentId}`,
        players: [],
        lock: false,
        stage: nextStage,
        countdownTimer: undefined,
        countdownRemaining: undefined,
        maxPlayer: nextStage === "SF" ? 4 : 2,
        tournamentDb: TournamentLobbyDb,
        allowedPlayers: new Set<number>(),
        nextStageExpectedPlayers: [],
        parentTournamentId: tournamentInfo.id,
      };

      tournaments.set(nextTournamentId, nextTournament);
      tournament.nextTournamentId = nextTournamentId;

      console.log(
        `[Tournament ${nextTournamentId}] Created next tournament (${nextStage}), waiting for winners...`,
      );
    }
  }

  // ✅ NEW: Add winner to next tournament immediately
  if (
    result.winnerId !== "draw" &&
    typeof result.winnerId === "number" &&
    tournament.nextTournamentId
  ) {
    addWinnerToNextTournament(tournamentInfo.id, result.winnerId);
  }

  // ✅ NEW: Update loser's ranking immediately after game ends
  if (result.rank !== undefined && result.winnerId !== "draw") {
    const loserId =
      result.winnerId === result.leftPlayerId
        ? result.rightPlayerId
        : result.leftPlayerId;

    const loserTournamentPlayerId = tournament.playerMap.get(loserId);
    if (loserTournamentPlayerId) {
      console.log(
        `[tournament player database] IMMEDIATE rank update for loser ${loserId} (tournamentPlayerId=${loserTournamentPlayerId}) to rank ${result.rank}`,
      );
      const updateResult = await updateTournamentPlayerRanking(
        result.rank,
        loserTournamentPlayerId,
      );
      if (updateResult.success) {
        tournament.rankUpdatedPlayers.add(loserId);
        console.log(
          `[tournament player database] ✅ Successfully updated loser ranking in DB immediately`,
        );
      } else {
        console.warn(
          `[tournament player database] ❌ Failed to update loser ranking:`,
          updateResult.error,
        );
      }
    }
  }

  //after create player and save match result, update player rank
  const resultCopy = {
    playerId:
      result.winnerId === "draw"
        ? null
        : typeof result.winnerId === "number"
          ? result.winnerId
          : null,
    stage: tournamentInfo.stage,
    scoreLeft: result.scoreLeft,
    scoreRight: result.scoreRight,
    winnerId:
      result.winnerId === "draw"
        ? null
        : typeof result.winnerId === "number"
          ? result.winnerId
          : null,
    duration: result.duration,
  };

  //update player map and tournament result
  const t = tournaments.get(tournamentInfo.id);
  if (!t) return;
  t.playerMap = t.playerMap || new Map<number, number>();
  for (const p of createdPlayer) {
    if (p.data) t.playerMap.set(p.data.userId, p.data.id);
  }

  //update tournament result
  t.result = t.result || [];
  t.result.push(resultCopy);

  //check if need to handle next stage
  const TotalMatches =
    tournamentInfo.stage === "QF"
      ? 4
      : tournamentInfo.stage === "SF"
        ? 2
        : tournamentInfo.stage === "F"
          ? 1
          : 0;
  const finishedMatches = t.result.filter(
    (r) => r.stage === tournamentInfo.stage,
  ).length;
  if (finishedMatches === TotalMatches) {
    console.log(
      `Tournament ${tournamentInfo.id} stage ${tournamentInfo.stage} completed.`,
    );
    await handleNextRound(
      tournamentInfo.id,
      tournamentInfo.stage,
      TournamentLobbyDb,
    );
  }
}

/**
 * @brief Handle the transition to the next round of the tournament.
 * @param tournamentId - The ID of the tournament.
 * @param currentStage - The current stage of the tournament ("QF", "SF", "F").
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 */
async function handleNextRound(
  tournamentId: number,
  currentStage: "QF" | "SF" | "F",
  TournamentLobbyDb: { id: number; status: string; createdAt: Date },
) {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  // ✅ Ensure tracking set exists
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  // If placements were computed by roomEndGame, apply them instead of recalculating.
  if (
    Array.isArray(tournament.placements) &&
    tournament.placements.length > 0
  ) {
    console.log(
      `[tournament player database] applying precomputed placements for tournament ${tournamentId}`,
    );
    await applyPlacementsToDB(tournamentId);
    if (currentStage === "F") {
      console.log(
        `Tournament ${tournamentId} completed with precomputed placements.`,
      );
      const updateTournamentDB = await updateTournamentStatus(
        "COMPLETED",
        TournamentLobbyDb.id,
      );
      console.log(
        "[tournament database] Tournament status updated to COMPLETED: ",
        updateTournamentDB,
      );
      // ✅ Clear tracking set when tournament completes
      tournament.rankUpdatedPlayers.clear();
    }
  } else {
    //collect winners and losers and results from current stage
    const ThisRoundResult = tournament.result?.filter(
      (r) => r.stage === currentStage,
    );
    const winners: {
      id: number;
      username: string;
      spriteUrl: string;
      ready: boolean;
    }[] = [];
    const losers: { id: number; duration: number }[] = [];

    // collect winners and losers from current stage
    for (const match of ThisRoundResult ?? []) {
      const matchInfo = tournament.matches?.find((m) =>
        m.players.some((p) => p.id === match.winnerId),
      );
      if (!matchInfo || !matchInfo.players[0] || !matchInfo.players[1])
        continue;
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
      QF: [5, 8],
      SF: [3, 4],
      F: [2, 2],
    };
    const minRank = stageRankMap[currentStage] ?? [0, 0];
    const loserStartRank = minRank[0] || 0;

    // assign ranks to losers
    const rankedLosers = losers.map((p, i) => ({
      playerId: p.id,
      rank: loserStartRank + i,
    }));

    //update the loser rankings in database before proceeding to next stage
    // ✅ Skip players whose rank was already updated immediately
    const updatePromises = rankedLosers
      .filter((rl) => !tournament.rankUpdatedPlayers?.has(rl.playerId))
      .map(async (rl) => {
        if (!tournament.playerMap) {
          console.warn(
            `No playerMap for tournament ${tournamentId}; cannot update ranking for ${rl.playerId}`,
          );
          return;
        }
        const tournamentPlayerId = tournament.playerMap.get(rl.playerId);
        if (!tournamentPlayerId) {
          console.warn(
            `No tournament player id for user ${rl.playerId} in tournament ${tournamentId}`,
          );
          return;
        }
        console.log(
          `[BATCH] Update player id ${tournamentPlayerId} (${rl.playerId}) ranking to ${rl.rank}`,
        );
        const result = await updateTournamentPlayerRanking(
          rl.rank,
          tournamentPlayerId,
        );
        if (result.success) {
          tournament.rankUpdatedPlayers?.add(rl.playerId);
        }
        return result;
      });

    await Promise.all(updatePromises);

    //handle next stage
    const nextStageMap: Record<string, string | null> = {
      QF: "SF",
      SF: "F",
      F: null,
    };
    const nextStage = nextStageMap[currentStage];

    // If this was the final (no nextStage), update the rank of the winners
    if (!nextStage) {
      // ✅ Skip winners whose rank was already updated
      const winnerRankPromises = winners
        .filter((w) => !tournament.rankUpdatedPlayers?.has(w.id))
        .map(async (w, idx) => {
          if (!tournament.playerMap) return;
          const tournamentPlayerId = tournament.playerMap.get(w.id);
          if (!tournamentPlayerId) {
            console.warn(
              `No tournament player id for winner ${w.id} in tournament ${tournamentId}`,
            );
            return;
          }
          const winnerRank = idx + 1; // first winner = 1
          console.log(
            `[BATCH] Update winner id ${tournamentPlayerId} (${w.id}) ranking to ${winnerRank}`,
          );
          const result = await updateTournamentPlayerRanking(
            winnerRank,
            tournamentPlayerId,
          );
          if (result.success) {
            tournament.rankUpdatedPlayers?.add(w.id);
          }
          return result;
        });
      await Promise.all(winnerRankPromises);
    }

    // If no next stage, finalize tournament
    if (!nextStage) {
      const winnerIds = winners.map((w) => w.id);
      tournament.players = winners;
      tournament.matches = [];
      tournament.result =
        tournament.result?.filter((r) => r.stage !== currentStage) ?? [];
      tournament.lock = false;

      // reset client map so only winners' sockets get registered when they reconnect or are transferred
      tournament.clientMap = new Map<
        WebSocket,
        { tournamentId: number; playerId: number }
      >();
      // record allowed players so WS can reject eliminated re-joins
      tournament.allowedPlayers = new Set<number>(winnerIds);

      console.log(
        `Tournament ${tournamentId} prepared NEW lobby for stage ${nextStage} with players:`,
        winnerIds,
      );

      console.log(`Tournament ${tournamentId} completed.`);
      const updateTournamentDB = await updateTournamentStatus(
        "COMPLETED",
        TournamentLobbyDb.id,
      );
      if (updateTournamentDB.success)
        console.log(
          "[ update tournament DB ] Tournament status updated to COMPLETED: ",
          updateTournamentDB.data,
        );
      else
        console.log(
          "[ update tournament DB ] Tournament status update failed: ",
          updateTournamentDB.error,
        );
      console.log(
        `[ update tournament DB ] Deleting tournament ${tournamentId} from memory.`,
      );
      tournament.rankUpdatedPlayers.clear();
      tournaments.delete(tournamentId);
      return;
    }
    return;
  }
}

/**
 * @brief Apply precomputed placements to the database. (player rankings)
 * @param tournamentId - The ID of the tournament.
 */
async function applyPlacementsToDB(tournamentId: number): Promise<void> {
  const tournament = tournaments.get(tournamentId);
  if (!tournament) return;

  if (
    !Array.isArray(tournament.placements) ||
    tournament.placements.length === 0
  ) {
    console.debug(
      `[tournament player database] no placements to apply for ${tournamentId}`,
    );
    return;
  }

  tournament.playerMap = tournament.playerMap || new Map<number, number>();
  // ✅ Ensure tracking set exists
  if (!tournament.rankUpdatedPlayers) {
    tournament.rankUpdatedPlayers = new Set<number>();
  }

  // ✅ Filter out players whose rank was already updated
  const updates = tournament.placements
    .filter((p) => {
      const userId = typeof p?.clientId === "number" ? p.clientId : null;
      return userId !== null && !tournament.rankUpdatedPlayers?.has(userId);
    })
    .map(async (p: PlacementEntry) => {
      const userId =
        typeof p?.clientId === "number"
          ? p.clientId
          : typeof p?.playerId === "number"
            ? p.playerId
            : null;
      const rank =
        typeof p?.rank === "number"
          ? p.rank
          : typeof p?.position === "number"
            ? p.position
            : null;
      if (userId == null || rank == null) {
        console.warn(
          `[tournament player database] skip invalid placement entry`,
          p,
        );
        return;
      }

      const tournamentPlayerId = tournament.playerMap?.get(userId);
      if (!tournamentPlayerId) {
        console.warn(
          `[tournament player database] no tournamentPlayerId for user ${userId} (tournament ${tournamentId})`,
        );
        return;
      }

      try {
        console.log(
          `[tournament player database] update ranking: tournamentPlayerId=${tournamentPlayerId}, rank=${rank}`,
        );
        const tournamentPlayerDb = await updateTournamentPlayerRanking(
          rank,
          tournamentPlayerId,
        );
        if (tournamentPlayerDb.success) {
          // ✅ Mark this player as ranked
          tournament.rankUpdatedPlayers?.add(userId);
          console.log(
            `[tournament player database] updated player ranking in DB:`,
            tournamentPlayerDb.data,
          );
        } else {
          console.warn(
            `[tournament player database] failed to update player ranking in DB:`,
            tournamentPlayerDb.error,
          );
        }
        return tournamentPlayerDb;
      } catch (err) {
        console.error(
          "[tournament player database] failed updating player ranking:",
          err,
        );
      }
    });

  await Promise.all(updates);
}
