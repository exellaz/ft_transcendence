import { PongGame } from "@shared/game/pong.ts";
import type { WebSocket as WSWebSocket } from "ws";

export interface PlacementEntry {
  clientId: number;
  rank: number;
  playerId?: number;
  position?: number;
}

export interface TournamentDb {
  id: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentPlayerWs {
  id: number;
  username: string;
  spriteUrl: string;
  ready: boolean;
}

export interface TournamentMatch {
  roomId: number;
  players: TournamentPlayerWs[];
  winnerId: number;
}

export interface TournamentLobby {
  id: number;
  name: string;
  players: TournamentPlayerWs[];
  matches?: TournamentMatch[];
  playerMap?: Map<number, number>;
  result?: {
    playerId: number | null;
    stage: "QF" | "SF" | "F";
    scoreLeft: number;
    scoreRight: number;
    winnerId: number | null;
    duration: number;
  }[];
  lock: boolean;
  stage: "QF" | "SF" | "F";
  countdownTimer?: NodeJS.Timeout | undefined;
  countdownRemaining?: number | undefined;
  maxPlayer: number;
  broadcast?: (msg: string) => void;
  clientMap?: Map<WSWebSocket, { tournamentId: number; playerId: number }>;
  allowedPlayers?: Set<number> | undefined;
  nextTournamentId?: number;
  parentTournamentId?: number;
  tournamentDb?:
    | { id: number; status: string; createdAt: Date }
    | null
    | undefined;
  eliminatedOrder?: number[];
  placements?: { clientId: number; rank: number }[];
  rankUpdatedPlayers?: Set<number> | undefined;
  lobbyTimeout?: NodeJS.Timeout | undefined;
  lobbyTimeoutStarted?: boolean;
  dummyPlayers?: Set<number>;
  nextStageExpectedPlayers?: number[];
  expectedPlayerInfo?: Map<
    number,
    { id: number; username: string; spriteUrl: string }
  >;
}

export interface DummyPlayer extends TournamentPlayerWs {
  isDummy: true;
  originalPlayerId: number;
}

export interface TournamentGameRoom {
  id: number;
  name: string;
  players: {
    id: number;
    username: string;
    spriteUrl: string;
    side: "left" | "right";
  }[];
  gameStarted: boolean;
  gameEnded: boolean;
  tournamentId?: number;
}

export interface playerInfo {
  clientId: number; // client id
  playerName: string; // player username
  role: string; // "left" or "right"
  team: "left" | "right" | "spectator"; // team side
  leader: boolean; // whether the player is the leader
  spriteUrl: string; // URL of the player's sprite
  ready: boolean; // whether the player is ready
  online: boolean; // whether the player is online
  finishTime?: number; // time taken to finish the game
}

/**
 * @brief Room interface ( is like a room information structure)
 */
export interface Room {
  id: number; // room id
  name: string; // room name
  teamSize: number; // team size (1vs1 or 2vs2)
  setting: {
    ballSpeed: number; // ball speed
    ballSize: number; // ball size
    paddleSpeed: number; // paddle speed
    scorePoint: number; // points to win the game
    map: string; // game map
  };
  gameState: {
    teams: { left: playerInfo[]; right: playerInfo[] }; //[key] => team side, [value] => playerInfo array
    score: { left: number; right: number }; //[key] => team side, [value] => score
  };
  clients: Set<WSWebSocket>; // Set of WebSocket connections
  clientRoles: Map<number, playerInfo>; //[key] => client id, [value] => playerInfo
  sockets: Map<WSWebSocket, number>; //[key] => socket, [value] => client id
  chatHistory: liveChatMessage[]; // Array to store chat messages
  startTime?: Date; //start game time
  endTime?: Date; //end game time
  result?: {
    // game result
    winner: "left" | "right" | "draw";
    scoreLeft: number;
    scoreRight: number;
  };
  game: PongGame; // Game instance for game logic
  loopHandle?: NodeJS.Timeout | null; // Interval handle for the game loop
  duration?: number; // game duration
  canStart: boolean; // Flag to indicate if player all ready
  leaderId: number; // clientId of the room leader
  private: boolean; // Flag to indicate if the room is private
  countdownTimer?: NodeJS.Timeout | null; // Interval handle for the countdown before game start
  countdownRemaining?: number | null; // Remaining seconds in the countdown
  inGame?: boolean;
  tournamentId?: number;
}

export interface GameSettings {
  ballSpeed?: number;
  ballSize?: number;
  paddleSpeed?: number;
  scorePoint?: number;
  map?: string;
}

export interface WSContext {
  clientId: number;
  roomId: number;
  room: Room;
  side?: "left" | "right" | undefined;
  playerName: string;
  playerSprite: string;
}

export interface listRoomsResponse {
  id: number;
  name: string;
  teamSize: number;
  leftPlayers: number;
  rightPlayers: number;
  gameStarted: boolean;
  gameEnded: boolean;
  private: boolean;
}

export type BroadcastMessage =
  | liveChatMessage
  | gameOver
  | countdown
  | countdownCancel
  | roleUpdate
  | roomPrivacyUpdate
  | roleUpdateReadyStatus
  | playerOfflineStatus
  | matchCountdown
  | matchCountdownCancel;

/**
 * @brief Represents a chat message in the game.
 */
export interface liveChatMessage {
  type: "chat";
  id: number;
  from: string;
  text: string;
  time: number;
}

export interface gameOver {
  type: "game_over";
  canLeave: boolean;
  result: Room["result"];
  playerLeft: Room["gameState"]["teams"]["left"];
  playerRight: Room["gameState"]["teams"]["right"];
  tournamentId?: number;
  tournamentDb?: { id: number; status: string; createdAt: Date } | null;
  placements: PlacementEntry[];
}

export interface countdown {
  type: "countdown";
  remaining: number;
}

export interface countdownCancel {
  type: "countdownCancel";
}

export interface roleUpdate {
  type: "roleUpdate";
  newPlayer: playerInfo;
  gameState: Room["gameState"];
  leaderId: number;
  canStart: boolean;
  readyStatus?: playerInfo["ready"];
  playerDisconnected?: number;
}

export interface roleUpdateReadyStatus {
  type: "roleUpdate";
  gameState: Room["gameState"];
  leaderId: number;
}

export interface roomPrivacyUpdate {
  type: "roomPrivacyUpdate";
  data: {
    type: string;
  };
}

export interface playerOfflineStatus {
  type: "playerOffline";
  clientId: number;
  playerName: string;
}

export interface matchCountdown {
  type: "matchCountdown";
  remaining: number;
}

export interface matchCountdownCancel {
  type: "matchCountdownCancel";
}
