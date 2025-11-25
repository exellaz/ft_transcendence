import { tournaments } from "./tournament.routes";
import {
  handleSemiFinalSpecialCases,
  handleFinalSpecialCases,
} from "./handleNextTournament";
import { createMatchRoom } from "./handleMatchRoom";
import WebSocket from "ws";
import { TournamentMatch } from "../../types/interface";
import { createTournament } from "./tournament.service";

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
    console.log(
      `[Tournament ${tournamentId}] ⚠️ Timeout already running, NOT restarting`,
    );
    return;
  }

  const startTime = Date.now();

  console.log(
    `[Tournament ${tournamentId}] ⏰ Starting ${timeoutSeconds}s timeout`,
  );

  // Start new timeout
  tournament.lobbyTimeout = setTimeout(async () => {
    const actualEndTime = Date.now();
    const actualDuration = (actualEndTime - startTime) / 1000;

    console.log(
      `[Tournament ${tournamentId}] ⏰ Timeout FIRED after ${actualDuration.toFixed(2)}s (expected ${timeoutSeconds}s)`,
    );

    const t = tournaments.get(tournamentId);
    if (!t || t.lock) return;

    const currentPlayerCount = t.players.length;
    const missingPlayerCount = expectedPlayerCount - currentPlayerCount;

    console.log(
      `[Tournament ${tournamentId}] Stage: ${t.stage}, Expected: ${expectedPlayerCount}, Current: ${currentPlayerCount}, Missing: ${missingPlayerCount}`,
    );

    if (t.stage === "F") {
      await handleFinalSpecialCases(tournamentId, t, currentPlayerCount);
      return;
    }

    // handle semi final special cases (0, 1, 2, 3 players)
    if (t.stage === "SF") {
      await handleSemiFinalSpecialCases(
        tournamentId,
        t,
        currentPlayerCount,
        expectedPlayerCount,
      );
      return;
    }

    // ✅ Clear the timeout reference and flag
    t.lobbyTimeout = undefined;
    t.lobbyTimeoutStarted = false;
  }, timeoutSeconds * 1000);
}

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
  tournament.countdownTimer = placeholder as unknown as ReturnType<
    typeof setTimeout
  >;

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
  const startTournamentNow = async () => {
    if (tournament.lock) return;
    clearInterval(tournament.countdownTimer);
    tournament.countdownTimer = undefined;
    tournament.countdownRemaining = undefined;
    tournament.lock = true;

    const shuffled = [...tournament.players].sort(() => 0.5 - Math.random());

    const dummyCount = shuffled.filter((p) =>
      tournament.dummyPlayers?.has(p.id),
    ).length;
    const realPlayerCount = shuffled.length - dummyCount;

    console.log(
      `[Tournament ${tournamentId}] Starting with ${realPlayerCount} real players, ${dummyCount} dummies`,
    );

    // ✅ Handle special cases based on stage
    if (tournament.stage === "SF") {
      if (realPlayerCount === 0) {
        console.log(
          `[Tournament ${tournamentId}] SF: All dummies, using special case handler`,
        );
        await handleSemiFinalSpecialCases(
          tournamentId,
          tournament,
          0,
          tournament.maxPlayer,
        );
        return;
      }
      if (realPlayerCount === 1) {
        console.log(
          `[Tournament ${tournamentId}] SF: Only 1 real player, using special case handler`,
        );
        await handleSemiFinalSpecialCases(
          tournamentId,
          tournament,
          1,
          tournament.maxPlayer,
        );
        return;
      }
      if (realPlayerCount === 2) {
        console.log(
          `[Tournament ${tournamentId}] SF: Only 2 real players, using special case handler`,
        );
        await handleSemiFinalSpecialCases(
          tournamentId,
          tournament,
          2,
          tournament.maxPlayer,
        );
        return;
      }
    }

    if (tournament.stage === "F") {
      if (realPlayerCount === 0) {
        console.log(
          `[Tournament ${tournamentId}] F: All dummies, using special case handler`,
        );
        await handleFinalSpecialCases(tournamentId, tournament, 0);
        return;
      }
      if (realPlayerCount === 1) {
        console.log(
          `[Tournament ${tournamentId}] F: Only 1 real player, using special case handler`,
        );
        await handleFinalSpecialCases(tournamentId, tournament, 1);
        return;
      }
    }

    //normal case: create match rooms and assign players
    const matches: TournamentMatch[] = [];

    //shuffle players and pair them into match rooms
    for (let i = 0; i < shuffled.length; i += 2) {
      const pair = shuffled.slice(i, i + 2);
      const room = createMatchRoom(
        tournamentId,
        pair,
        tournament,
        TournamentLobbyDb!,
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
