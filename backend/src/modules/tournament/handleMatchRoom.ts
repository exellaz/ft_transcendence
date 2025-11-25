import { tournaments } from "./tournament.routes";
import { saveMatchResult } from "./saveResult";
import { rooms, roomEndGame, generateRoomId } from "../room/room";
import { PongGame } from "@shared/game/pong.ts";
import WebSocket from "ws";
import { playerInfo, Room, TournamentLobby } from "../../types/interface";

/**
 * @brief Create a game room for a tournament match.
 * @param tournamentId - The ID of the tournament.
 * @param playerPair - Array of two players participating in the match.
 * @param tournamentInfo - Information about the tournament lobby.
 * @param TournamentLobbyDb - Database record of the tournament lobby.
 * @return The created game room.
 */
export function createMatchRoom(
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
    tournamentId: tournamentId,
  };

  rooms.set(roomId, newRoom);

  console.log(
    `Created game room ${roomName} (${roomId}) for tournament ${tournamentId} with players ${leftPlayer.playerName} and ${rightPlayer.playerName}`,
  );
  return newRoom;
}
