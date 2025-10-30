import { Room, GameSettings, TournamentLobby, gameOver, playerInfo } from "../../types/interface";
import { broadcast } from "../../utils/utils";
import { PongGame } from "@shared/game/pong.ts";
import { tournaments } from "../tournament/tournament.routes";
import os from "os";
import { performance } from "perf_hooks";

//default value for setting
export const DEFAULT_SETTING: GameSettings = {
  ballSpeed: 1,
  ballSize: 1,
  paddleSpeed: 1,
  scorePoint: 3,
  map: "stadium",
};

/**
 * @brief initialize all rooms as a map
 * @key room id
 * @value Room object (info about the room)
 */
export const rooms: Map<number, Room> = new Map();

/**
 * @brief generate random 6 digit room id
 * @param length length of the room id (default: 6)
 * @returns room id as string
 */
export function generateRoomId(length = 6): number {
  return Math.floor(Math.random() * Math.pow(10, length));
}

/**
 * @brief create a room from client input parameters
 * @param id room id
 * @param name room name
 * @param teamSize team size (default: 1)
 * @param width room width (default: 800)
 * @param height room height (default: 400)
 * @param leaderId client id of the room leader (default: "")
 * @param isPrivate whether the room is private (default: false)
 * @param initialSetting initial game setting (default: empty object)
 * @returns Room object
 */
export function createRoom(
  id: number,
  name: string,
  teamSize = 1,
  leaderId: number = -1,
  isPrivate: boolean = false,
  initialSetting: Partial<typeof DEFAULT_SETTING> = {},
): Room {
  const game = new PongGame(
    false,
    { ...DEFAULT_SETTING, ...initialSetting },
    (winner) => {
      roomEndGame(room, false, winner);
    },
    teamSize,
  );

  const room: Room = {
    id,
    name,
    teamSize,
    setting: {
      ballSpeed: DEFAULT_SETTING.ballSpeed ?? -1,
      ballSize: DEFAULT_SETTING.ballSize ?? -1,
      paddleSpeed: DEFAULT_SETTING.paddleSpeed ?? -1,
      scorePoint: DEFAULT_SETTING.scorePoint ?? -1,
      map: DEFAULT_SETTING.map ?? "unknown",
    },
    gameState: {
      teams: { left: [], right: [] },
      score: { left: 0, right: 0 },
    },
    clients: new Set(),
    clientRoles: new Map(),
    sockets: new Map(),
    chatHistory: [] as [],
    game: game,
    canStart: false,
    leaderId: leaderId,
    private: isPrivate,
  };
  return room;
}

const ENABLE_FPS_CAP: boolean = false;
const FPS_CAP: number = 60;

let lastLoopTime = performance.now();

/**
 * @brief start the game loop for a room
 * @param room Room object
 */
export function startRoomLoop(room: Room) {
  if (room.loopHandle) return;

  // mark room as in-game and notify clients once
  room.inGame = true;

  // debug: log who will receive the start message
  try {
    const recipients = Array.from(room.sockets.keys()).map((s: any, idx) => {
      const remote = (s as any)?._socket?.remoteAddress ?? (s as any)?.remoteAddress ?? `socket#${idx}`;
      return remote;
    });
    console.log(`[room] startRoomLoop sending gameStart to ${recipients.length} sockets:`, recipients);
  } catch (err) {
    console.warn("[room] failed to enumerate room.sockets for debug:", err);
  }

  const startMsg = JSON.stringify({ type: "gameStart", roomId: room.id });
  for (const s of room.sockets.keys()) {
    try { s.send(startMsg); } catch (e) { console.warn("failed notify start", e); }
  }

  roomStartGame(room);

  let sendAccumulator = 0;

  room.loopHandle = setInterval(() => {
    const loopStart = performance.now();
    const loopDelta = loopStart - lastLoopTime;
    lastLoopTime = loopStart;

    // --- Game logic ---
    room.game.update(room);

    sendAccumulator += room.game.delta * 1000; // convert to ms

    function broadcast(room: Room) {
      const rawOutput = room.game.exportState(false);
      const output = JSON.stringify({
        state: rawOutput,
        metadata: {
          timestamp: Date.now(),
          delta: room.game.delta,
          fps: room.game.fps,
        },
      });

      for (const paddle of [
        ...room.game.teamLeft.getPaddles(),
        ...room.game.teamRight.getPaddles(),
      ]) {
        //console.log(`[room.broadcast] sending frame to client ${paddle.player.id}`);
        const sock = paddle.player.socket;
        if (!sock) continue;
        try {
            sock.send(output);
        } catch (err) {
            console.warn(`[room.broadcast] failed to send frame to client ${paddle.player.id}:`, err);
        }
      }
    }

    if (ENABLE_FPS_CAP) {
      if (sendAccumulator >= 1000 / FPS_CAP) {
        // send at 30fps
        sendAccumulator = 0;
        broadcast(room);
      }
    } else {
      broadcast(room);
    }

    // --- PERFORMANCE METRICS ---
    const loopEnd = performance.now();
    const frameTime = loopEnd - loopStart;

    const memory = process.memoryUsage();
    const cpu = os.loadavg(); // system load over 1, 5, 15 minutes

    //if (Math.random() < 0.05) {
      // log ~5% of frames to avoid spamming
    //  console.log(
    //    `[PERF] Frame: ${frameTime.toFixed(2)}ms | Loop Δ: ${loopDelta.toFixed(2)}ms | ` +
    //      `Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB | ` +
    //      `Load: ${cpu.map((v) => v.toFixed(2)).join(", ")}`,
    //  );
    //} ////debug
  }, 1000 / 55);
}
/**
 * @brief start the game time use date for later calculate duration
 * @param room Room object
 */
export function roomStartGame(room: Room) {
    room.startTime = new Date();
}

/**
 * @brief end the game time and calculate duration
 * @param room Room object
 * @param forced Whether to force end the game
 */
export function roomEndGame(
  room: Room,
  forced = false,
  overrideWinner?: "left" | "right" | "draw",
  tournamentId?: number,
) {
  // If game already ended, do nothing
  if (room.result) return;

  // close the game when is end
  room.endTime = new Date();

  //stop loop
  if (room.loopHandle) {
    clearInterval(room.loopHandle);
    room.loopHandle = null;
  }

  //if not force to end then determine winner by score
  let winner: "left" | "right" | "draw";
  if (overrideWinner) {
    winner = overrideWinner;
  } else if (!forced) {
    if (room.game.scoreLeft > room.game.scoreRight) winner = "left";
    else if (room.game.scoreLeft < room.game.scoreRight) winner = "right";
    else winner = "draw";
  } else {
    // if forced, determine winner by current score
    const left = room.game.scoreLeft;
    const right = room.game.scoreRight;
    if (left > right) winner = "left";
    else if (left < right) winner = "right";
    else winner = "draw";
  }

  // set the result
  room.result = {
    winner,
    scoreLeft: room.game.scoreLeft,
    scoreRight: room.game.scoreRight,
  };

  // Calculate duration for a game
  const start = room.startTime ?? new Date(); //if the start time is undefined, use current time
  const end = room.endTime ?? new Date(); //if the end time is undefined, use current time
  const ms = end.getTime() - start.getTime(); // milliseconds
  room.duration = ms; // store raw ms (number)

  //broadcast everyone the game is ended
  //prepare game over payload and include next tournament info if available
  const payload: gameOver = {
	type: "game_over",
	canLeave: true,
	result: room.result,
	playerLeft: room.gameState.teams.left,
	playerRight: room.gameState.teams.right,
	tournamentId: tournamentId || 0,
    placements: [],
  }

  // attach current tournament database info to payload and send to next tournament
  try {
	const parent = tournaments.get(tournamentId || -1);
	// console.log("roomEndGame: attaching next tournament info for tournamentId:", tournamentId, parent); ////debug
	if (parent?.tournamentDb !== undefined) {
		payload.tournamentDb = parent.tournamentDb || null;
	}
  } catch (e) {
		console.error("roomEndGame: failed to attach next tournament info:", e);
  }

  // update tournament eliminated order and placements
  try {
    const tId = tournamentId ?? -1;
    const tournament = tournaments.get(tId);
    if (tournament) {
      // determine losers for this match
      const losersRaw = winner === "left" ? (room.gameState.teams.right ?? []) : (room.gameState.teams.left ?? []);

      // Convert losersRaw -> ordered clientId list:
      // Priority: server-provided finishTime on each player, else preserve array order
      let losersOrderedClientIds: number[] = [];
      const extractClientId = (p: {clientId: number, id?: number}) => typeof p?.clientId === "number" ? p.clientId : typeof p?.id === "number" ? p.id : null;

      // sort by finishTime if available
      if (Array.isArray(losersRaw) && losersRaw.length > 0) {
        const hasFinishTimes = losersRaw.every((p: { finishTime?: number }) => p && (p.finishTime !== undefined));
        const losersCopy = losersRaw.slice();
        if (hasFinishTimes) {
          losersCopy.sort((a: { finishTime?: number }, b: { finishTime?: number }) => (Number(a.finishTime) || 0) - (Number(b.finishTime) || 0));
        }
        // For team matches (doubles) where a team has multiple players, push each member in the same order
        losersOrderedClientIds = losersCopy.map((p: playerInfo) => extractClientId(p)).filter((c: number | null) => typeof c === "number");
      }

      const placements = updateTournamentEliminatedOrderAndPlacements(tournament, losersOrderedClientIds);
      payload.placements = placements;
    }
  } catch (err) {
    console.error("roomEndGame: failed computing tournament placements:", err);
  }

  broadcast(room, payload);

  const leftPlayer = room.gameState.teams.left
    .map((p) => p.clientId)
    .join(", ");
  const rightPlayer = room.gameState.teams.right
    .map((p) => p.clientId)
    .join(", ");
  const placementMap = buildPlacementMap(payload.placements);

  console.log("====================== GAME OVER ==================");
  console.log(`Left team: [${leftPlayer}], Right team: [${rightPlayer}]`);
  console.log(`Room ${room.id}`);
  console.log(
    `Winner: ${winner} => ${winner === "left" ? leftPlayer : winner === "right" ? rightPlayer : ""}`,
  );
  console.log(
    `Final Score - Left: ${room.game.scoreLeft}, Right: ${room.game.scoreRight}`,
  );
  console.log(
    `Duration: ${Math.floor(room.duration / 1000)} sec (${room.duration} ms)`,
  );

  console.log(
    `player left id: ${leftPlayer} is rank ${room.gameState.teams.left
      .map((p: playerInfo) => `${placementMap.get(p.clientId) ?? "n/a"}`)
      .join(", ")}`,
  );
  console.log(
    `player right id: ${rightPlayer} is rank ${room.gameState.teams.right
      .map((p: playerInfo) => `${placementMap.get(p.clientId) ?? "n/a"}`)
      .join(", ")}`,
  );
  console.log("===================================================");

  const roomId = room.id;
  const tId = tournamentId ?? -1;
  const tournament = tournaments.get(tId);

  //check is tournament match or room match
  if (!tournament) {
    //console.log(`[room] can't found tournament: ${tId}`); ////debug
    room.sockets.clear();
	room.clients.clear();
    if (rooms.has(roomId)) {
      console.log(`Deleted room ${roomId} after game end.`); ////debug
      rooms.delete(roomId);
    }
    return;
  }

  // Close all sockets and clean up room
  room.sockets.clear();
  room.clients.clear();
  if (rooms.has(roomId)) {
    console.log(`Deleted match room ${roomId} after game end.`);
    rooms.delete(roomId);
  }

  return {
    leftPlayerId: parseInt(leftPlayer),
    rightPlayerId: parseInt(rightPlayer),
    winnerId: winner === "left" ? parseInt(leftPlayer) : winner === "right" ? parseInt(rightPlayer) : "draw",
    loserId: winner === "left" ? parseInt(rightPlayer) : winner === "right" ? parseInt(leftPlayer) : "draw",
    scoreLeft: room.game.scoreLeft,
    scoreRight: room.game.scoreRight,
    duration: room.duration,
    rank: winner !== "left" ? placementMap.get(parseInt(leftPlayer)) : placementMap.get(parseInt(rightPlayer)),
  }
}

/**
 * @brief Append losers (in order) to tournament.eliminatedOrder and compute placements => [clientId, rank]
 *
 */
function updateTournamentEliminatedOrderAndPlacements(tournament: TournamentLobby, losersOrderedClientIds: number[]) {
  if (!Array.isArray(tournament.eliminatedOrder)) tournament.eliminatedOrder = [];

  // Append new losers in order, avoid duplicates
  for (const cid of losersOrderedClientIds) {
    if (!tournament.eliminatedOrder.includes(cid)) tournament.eliminatedOrder.push(cid);
  }

  // Determine total players count for placement calculation
  const totalPlayers = Number(
    tournament.players?.length ??
    2
  ) || 2;

  // Compute placements: first eliminated -> the first end game team gets lowest rank -> highest number
  const placements = tournament.eliminatedOrder.map((cid: number, idx: number) => ({
    clientId: cid,
    rank: Math.max(1, totalPlayers - idx),
  }));

  // when only one player remaining, assign them rank 1
  if (tournament.eliminatedOrder.length === totalPlayers - 1) {
    const playersList = Array.isArray(tournament.players) ? tournament.players : [];
    const extractId = (p: any) => (typeof p?.clientId === "number" ? p.clientId : typeof p?.id === "number" ? p.id : null);
    const remaining = playersList.map(extractId).find((id: number) => id != null && !tournament.eliminatedOrder.includes(id));
    if (typeof remaining === "number" && !placements.some((p: { clientId: number }) => p.clientId === remaining)) {
      placements.push({ clientId: remaining, rank: 1 });
    }
  }

  // Update tournament placements
  tournament.placements = placements;
  return placements;
}

/**
 * @brief Parse raw placements payload into array of [clientId, rank] tuples
 * @param raw Raw placements payload
 * @returns Array of [clientId, rank] tuples
 */
export function parsePlacementEntries(raw: any[] | undefined): [number, number][] {
  const arr = raw ?? [];
  return (arr as any[])
    .map((p: any) => {
      const id =
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
      return id !== null && rank !== null ? ([id, rank] as [number, number]) : null;
    })
    .filter((v: any): v is [number, number] => v !== null);
}

/**
 * @brief Build a Map from clientId to rank from raw placements payload
 * @param raw Raw placements payload
 * @returns Map of clientId to rank
 */
export function buildPlacementMap(raw: any[] | undefined): Map<number, number> {
  return new Map<number, number>(parsePlacementEntries(raw));
}