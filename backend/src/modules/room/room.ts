import { Room, GameSettings } from "../../utils/interface";
import { broadcast } from "../../utils/utils";
import { PongGame } from "@shared/game/pong.ts";

//default value for setting
export const DEFAULT_SETTING: GameSettings = {
  ballSpeed: 0,
  ballSize: 2,
  paddleSpeed: 0,
  scorePoint: 1,
  map: "mansion",
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
  );

  const room: Room = {
    id,
    name,
    teamSize,
    width: 800,
    height: 400,
    setting: {
      ballSpeed: DEFAULT_SETTING.ballSpeed ?? -1,
      ballSize: DEFAULT_SETTING.ballSize ?? -1,
      paddleSpeed: DEFAULT_SETTING.paddleSpeed ?? -1,
      scorePoint: DEFAULT_SETTING.scorePoint ?? -1,
      map: DEFAULT_SETTING.map ?? "unknown",
    },
    gameState: {
      ball: {
        x: 800 / 2,
        y: 400 / 2,
        dx: (initialSetting.ballSpeed ?? DEFAULT_SETTING.ballSpeed) as number,
        dy: (initialSetting.ballSpeed ?? DEFAULT_SETTING.ballSpeed) as number,
      },
      paddles: {},
      teams: { left: [], right: [] },
      score: { left: 0, right: 0 },
      gameStarted: false,
      gameEnded: false,
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

/**
 * @brief start the game loop for a room
 * @param room Room object
 */
export function startRoomLoop(room: Room) {
  // if loop already running, do nothing
  if (room.loopHandle) return;

  roomStartGame(room);

  // Start the game loop at 60 FPS
  room.loopHandle = setInterval(() => {
    // If room has no players, stop loop
    if (room.clients.size === 0) {
      clearInterval(room.loopHandle!);
      room.loopHandle = null;
      rooms.delete(room.id);
      console.log(`Room ${room.id} deleted due to no players.`); //? is it from DC ?
      return;
    }
    room.game.update(room);
  }, 1000 / 60);
}

/**
 * @brief start the game time use date for later calculate duration
 * @param room Room object
 */
export function roomStartGame(room: Room) {
  if (!room.gameState.gameStarted) {
    room.startTime = new Date();
    console.log(`room setting: ${JSON.stringify(room.setting)}`);
    // room.game.resetBall(room, "left");
  }
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

  //braodcast everyone the game is ended
  broadcast(room, {
    type: "game_over",
    canLeave: true,
  });

  const leftPLayer = room.gameState.teams.left
    .map((p) => p.playerName)
    .join(", ");
  const rightPlayer = room.gameState.teams.right
    .map((p) => p.playerName)
    .join(", ");

  console.log("====================== GAME OVER ==================");
  console.log(`Left team: [${leftPLayer}], Right team: [${rightPlayer}]`);
  console.log(`Room ${room.id}`);
  console.log(
    `Winner: ${winner} => ${winner === "left" ? leftPLayer : winner === "right" ? rightPlayer : ""}`,
  );
  console.log(
    `Final Score - Left: ${room.game.scoreLeft}, Right: ${room.game.scoreRight}`,
  );
  console.log(
    `Duration: ${Math.floor(room.duration / 1000)} sec (${room.duration} ms)`,
  );
  console.log("===================================================");

  const roomId = room.id;
  if (rooms.has(roomId)) {
    console.log(`Deleted room ${roomId} after game end.`);
    rooms.delete(roomId);
  }

  // Save match result to database
  // saveMatchResult(room, room.duration);
}
