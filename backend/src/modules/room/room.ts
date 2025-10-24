import { Room, GameSettings, TournamentLobby, gameOver } from "../../types/interface";
import { broadcast } from "../../utils/utils";
import { PongGame } from "@shared/game/pong.ts";
import { tournaments } from "../tournament/tournament.routes";
import { writeFileSync } from "fs";
import pako from "pako";
import os from "os";
import { performance } from "perf_hooks";

//default value for setting
export const DEFAULT_SETTING: GameSettings = {
  ballSpeed: 1,
  ballSize: 1,
  paddleSpeed: 1,
  scorePoint: 5,
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
        paddle.player.socket.send(output);
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
    // console.log(`room setting: ${JSON.stringify(room.setting)}`); ////debug
    // room.game.resetBall(room, "left");
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

//   //braodcast everyone the game is ended
//   broadcast(room, {
//     type: "game_over",
//     canLeave: true,
//     result: room.result,
//     playerLeft: room.gameState.teams.left,
//     playerRight: room.gameState.teams.right,
//     tournamentId: tournamentId || 0,
//   });
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

  try {
	const parent = tournaments.get(tournamentId || -1);
	// console.log("roomEndGame: attaching next tournament info for tournamentId:", tournamentId, parent); ////debug
	if (parent?.tournamentDb !== undefined) {
		payload.tournamentDb = parent.tournamentDb || null;
	}
  } catch (e) {
		console.error("roomEndGame: failed to attach next tournament info:", e);
  }

try {
  const tId = tournamentId ?? -1;
  const tournament = tournaments.get(tId);
  if (tournament) {
    // determine losers for this match (if team, this will be array of player objects)
    const losersRaw = winner === "left" ? (room.gameState.teams.right ?? []) : (room.gameState.teams.left ?? []);

    // Convert losersRaw -> ordered clientId list:
    // Priority: server-provided finishTime on each player, else preserve array order
    let losersOrderedClientIds: number[] = [];
    const extractClientId = (p: any) => typeof p?.clientId === "number" ? p.clientId : typeof p?.id === "number" ? p.id : null;

    if (Array.isArray(losersRaw) && losersRaw.length > 0) {
      const hasFinishTimes = losersRaw.every((p: any) => p && (p.finishTime !== undefined));
      const losersCopy = losersRaw.slice();
      if (hasFinishTimes) {
        losersCopy.sort((a: any, b: any) => (Number(a.finishTime) || 0) - (Number(b.finishTime) || 0));
      }
      // For team matches (doubles) where a team has multiple players, push each member in the same order
      losersOrderedClientIds = losersCopy.map((p: any) => extractClientId(p)).filter((c: any) => typeof c === "number");
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

  // replace fragile filtering logic with a direct lookup map
  // payload.placements comes from different sources and may not match the exact 'gameOver' type,
  // so coerce to any[] and extract clientId/playerId and rank/position robustly.
  const placementEntries: [number, number][] = (payload.placements as any[] || [])
    .map((p: any) => {
      const id = typeof p?.clientId === "number" ? p.clientId : typeof p?.playerId === "number" ? p.playerId : null;
      const rank = typeof p?.rank === "number" ? p.rank : typeof p?.position === "number" ? p.position : null;
      return id !== null && rank !== null ? [id, rank] as [number, number] : null;
    })
    .filter((v: any): v is [number, number] => v !== null);

  const placementMap = new Map<number, number>(placementEntries);

  console.log(
    `player left id: ${leftPlayer} is rank ${room.gameState.teams.left
      .map((p: any) => `${placementMap.get(p.clientId) ?? "n/a"}`)
      .join(", ")}`,
  );
  console.log(
    `player right id: ${rightPlayer} is rank ${room.gameState.teams.right
      .map((p: any) => `${placementMap.get(p.clientId) ?? "n/a"}`)
      .join(", ")}`,
  );
  console.log("===================================================");

  const roomId = room.id;
  const tId = tournamentId ?? -1;
  const tournament = tournaments.get(tId);
  if (!tournament) {
    console.log(`[room] can't found tournament: ${tId}`);
    return;
  }

  // Close all sockets and clean up room
  try {
	//for (const socket of Array.from(room.sockets.keys())) {
	//  try {
	//	socket.close(1000, "game ended");
	//  } catch (e) {
	//	console.error("[room] error closing socket:", e);
	//  }
	//}

	// Clear room maps/sets
	room.sockets.clear();
	room.clients.clear();

	// Remove the two players that participated in this room from the parent tournament's player list
	//if (tournament) {
	//  // gather clientIds from room teams
	//  const leftIds = (room.gameState.teams.left ?? []).map((p: any) => Number(p.clientId));
	//  const rightIds = (room.gameState.teams.right ?? []).map((p: any) => Number(p.clientId));
	//  const idsToRemove = new Set([...leftIds, ...rightIds].filter(id => !Number.isNaN(id)));

    //  // remove these ids from tournament.players
	//  if (idsToRemove.size > 0) {
	//	tournament.players = (tournament.players ?? []).filter((p: any) => !idsToRemove.has(Number(p.id)));

	//	//// prefer tournament.broadcast if provided, otherwise try clientMap to send update
	//	//const payload = JSON.stringify({ type: "playerLeft", players: tournament.players });
	//	//try {
	//	//  if (typeof tournament.broadcast === "function") {
	//	//	tournament.broadcast(payload);
	//	//  } else if (tournament.clientMap instanceof Map) {
	//	//	for (const [ws, info] of tournament.clientMap.entries()) {
	//	//	  try {
	//	//		if (info.tournamentId === tId) ws.send(payload);
	//	//	  } catch {}
	//	//	}
	//	//  }
	//	//} catch (e) {
	//	//  console.warn("[room] failed to notify tournament clients about removed players", e);
	//	//}
	//  }

    //  if (tournament.players.length === 0) {
    //    tournament.lock = false;
    //    console.log(`[room] no player tournament ${tId} so setting started=false`);
    //  }
	//}
    //const tournament = tournaments.get(tournamentId || -1);
    //if (tournament) {
        //console.log ("[room]: ", tournament.lock, tournament.players.length);
        //if (tournament.lock === false && tournament.players.length === 0) {
        //    console.log(`[room] cleaning up empty tournament ${tournamentId}`);
        //    tournaments.delete(tournamentId || -1);
        //}
    //}
  } catch (e) {
	console.error("[room] error during socket closing for game end:", e);
  }

  if (rooms.has(roomId)) {
    console.log(`Deleted room ${roomId} after game end.`);
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
 * Append losers (in order) to tournament.eliminatedOrder and compute placements array.
 */
function updateTournamentEliminatedOrderAndPlacements(tournament: any, losersOrderedClientIds: number[]) {
  if (!Array.isArray(tournament.eliminatedOrder)) tournament.eliminatedOrder = [];

  // Append new losers in order, avoid duplicates
  for (const cid of losersOrderedClientIds) {
    if (!tournament.eliminatedOrder.includes(cid)) tournament.eliminatedOrder.push(cid);
  }

  const totalPlayers = Number(
    tournament.tournamentDb?.playersCount ??
    tournament.players?.length ??
    tournament.initialPlayersCount ??
    tournament.playersCount ??
    2
  ) || 2;

  // Compute placements: first eliminated -> worst rank (totalPlayers), next -> totalPlayers-1, ...
  const placements = tournament.eliminatedOrder.map((cid: number, idx: number) => ({
    clientId: cid,
    rank: Math.max(1, totalPlayers - idx),
  }));

  // If all but one eliminated, ensure remaining player has rank 1
  if (tournament.eliminatedOrder.length === totalPlayers - 1) {
    const playersList = Array.isArray(tournament.players) ? tournament.players : [];
    const extractId = (p: any) => (typeof p?.clientId === "number" ? p.clientId : typeof p?.id === "number" ? p.id : null);
    const remaining = playersList.map(extractId).find((id: any) => id != null && !tournament.eliminatedOrder.includes(id));
    if (typeof remaining === "number" && !placements.some((p: any) => p.clientId === remaining)) {
      placements.push({ clientId: remaining, rank: 1 });
    }
  }

  // persist
  tournament.placements = placements;
  return placements;
}