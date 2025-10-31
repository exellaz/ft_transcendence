import type { playerInfo, Room } from "../types/interface";
import { rooms } from "../modules/room/room";
import { createLiveChatMessage } from "../modules/chat/liveChat";
import { broadcast, cancelCountdown } from "./utils";
import WebSocket, { WebSocket as WSWebSocket } from "ws";

/**
 * @brief Interface for WebSocketHandler class method
 */
interface IWebSocketHandler {
  assignRole(
    room: Room,
    clientId: number,
    socket: WSWebSocket,
    roomId: number,
    preferredSide: string,
    playerName: string,
    playerSprite: string,
  ): {
    id: number;
    role: string;
    playerName: string;
    team: string;
    leader: boolean;
    spriteUrl: string;
    ready: boolean;
    online: boolean;
  };
  handleDisconnect(
    socket: WSWebSocket,
    room: Room,
    clientId: number,
    roomId: number,
  ): void;
}

export class WebSocketHandler implements IWebSocketHandler {
  /**
   * @brief assign role to client (player, spectator, etc.)
   * @param room The game room object
   * @param clientId Unique identifier for the client
   * @param socket The WebSocket connection for the client
   * @param roomId The ID of the room
   * @return The assigned role as a string
   */
  assignRole(
    room: Room,
    clientId: number,
    socket: WebSocket,
    roomId: number,
    preferredSide: string,
    playerName: string,
    playerSprite: string,
  ): {
    id: number;
    role: string;
    playerName: string;
    team: string;
    leader: boolean;
    spriteUrl: string;
    ready: boolean;
    online: boolean;
  } {
    // Add socket to room if present
    if (socket) {
      room.sockets.set(socket, clientId);
      room.clients.add(socket);
    }

    //---- check if the client already has a playerinfo ----
    let player = room.clientRoles.get(clientId);
    //assign the info if not exist
    if (!player) {
      let roleStr: string;

      // assign player side according preferred side
      const totalPlayers =
        room.gameState.teams.left.length + room.gameState.teams.right.length;
      if (totalPlayers >= room.teamSize * 2) {
        console.log(
          `Room ${room.name} [${room.id}] is full. Rejecting player ${playerName} [${clientId}]`,
        );
        if (socket) {
          socket.send(
            JSON.stringify({
              type: "error",
              message: "Room is full",
            }),
          );
          socket.close(1000, "Room full");
        }

        return {
          id: clientId,
          role: "spectator",
          playerName,
          team: "spectator",
          leader: false,
          spriteUrl: playerSprite,
          ready: false,
          online: false,
        };
      }

      if (
        preferredSide === "left" &&
        room.gameState.teams.left.length < room.teamSize
      ) {
        roleStr = `left_player${room.gameState.teams.left.length + 1}`;
        room.gameState.teams.left.push({
          clientId,
          role: roleStr,
          playerName,
          team: "left",
          leader: clientId === room.leaderId,
          spriteUrl: playerSprite,
          ready: clientId === room.leaderId,
          online: true,
        });
      } else if (
        preferredSide === "right" &&
        room.gameState.teams.right.length < room.teamSize
      ) {
        roleStr = `right_player${room.gameState.teams.right.length + 1}`;
        room.gameState.teams.right.push({
          clientId,
          role: roleStr,
          playerName,
          team: "right",
          leader: clientId === room.leaderId,
          spriteUrl: playerSprite,
          ready: clientId === room.leaderId, // leader is always ready
          online: true,
        }); // add playerName to playerInfo
      } else {
        roleStr = "spectator";
      }

      // assign the player id and role to the map
      player = {
        clientId,
        role: roleStr,
        playerName,
        team: roleStr.startsWith("left") ? "left" : "right",
        leader: clientId === room.leaderId,
        spriteUrl: playerSprite,
        ready: clientId === room.leaderId, // leader is always ready
        online: true,
      };
      room.clientRoles.set(clientId, player);

      if (socket) {
        //notify to the client about his
        const playerInfo = room.clientRoles.get(clientId);
        socket.send(
          JSON.stringify({
            type: "roleUpdate",
            gameState: room.gameState,
            newPlayer: playerInfo,
            isSpectator: roleStr === "spectator",
            leaderId: room.leaderId,
          }),
        );

        // notify to all in the room about role
        console.log("Player role assigned:", playerInfo);
        broadcast(
          room,
          createLiveChatMessage(-1, "system", `${playerName} joined the game.`),
        );
        broadcast(room, {
          type: "roleUpdate",
          newPlayer: playerInfo,
          gameState: room.gameState,
          leaderId: room.leaderId,
        });
      }
    }

    return {
      id: clientId,
      role: player.role,
      playerName: player.playerName,
      team: player.team,
      leader: player.leader,
      spriteUrl: player.spriteUrl,
      ready: player.ready,
      online: player.online,
    };
  }

  /**
   * @brief handle client disconnection from the WebSocket.
   * @param socket The WebSocket connection for the client
   * @param room The game room object
   * @param clientId Unique identifier for the client
   * @param role The role of the client (player, spectator, etc.)
   * @param roomId The ID of the room
   */
  handleDisconnect(
    socket: WSWebSocket,
    room: Room,
    clientId: number,
    roomId: number,
  ) {
    // ---- guard check ----
    //if no room, no socket exit this function
    if (!room || !room.sockets) return;
    //console.log("Disconnect event for", clientId); ////debug

    // always trust the latest role from the server mapping
    const player = room.clientRoles.get(clientId);
    if (!player) return;

    const role = player.role;

    // ---- Remove socket and client from room ----
    room.sockets.delete(socket);
    room.clients.delete(socket);

    //mark offline and update the team status
    player.online = false;
    room.gameState.teams.left = room.gameState.teams.left.map(
      (p: playerInfo) =>
        p.clientId === clientId ? { ...p, online: false } : p,
    );
    room.gameState.teams.right = room.gameState.teams.right.map(
      (p: playerInfo) =>
        p.clientId === clientId ? { ...p, online: false } : p,
    );

    //! broadcast offline status (so clients can show disconnected indicator)
    if (room.game.state !== 2 && room.game.state !== 3) {
      broadcast(room, {
        type: "playerOffline",
        clientId,
        playerName: player.playerName,
      });
    }

    // --- handle leader leaving ---
    if (clientId === room.leaderId && room.game.state !== 3) {
      //check for remaining players except spectators and the leaving leader
      const remainingPlayers = room.clientRoles
        ? Array.from(
            room.clientRoles.entries() as Iterable<[number, playerInfo]>,
          )
            .filter(([id, p]) => p.role !== "spectator" && id !== clientId)
            .map(([id]) => id)
        : [];

      //if have remaining player when leader left pass leader to the player
      if (remainingPlayers.length > 0 && room.game.state !== 2) {
        room.leaderId = remainingPlayers[0] as number; // assign new leader
        const newLeader = room.clientRoles.get(room.leaderId);
        if (newLeader) {
          newLeader.leader = true;
        }
        // broadcast(room, createLiveChatMessage(-1, "system", `leader change to ${room.clientRoles.get(room.leaderId)?.playerName}.`));
        console.log(
          `Leader ${room.clientRoles.get(clientId)?.playerName} [ ${clientId} ] left. New leader is ${room.clientRoles.get(room.leaderId)?.playerName} [ ${room.leaderId} ] in room ${room.name} (${roomId})`,
        );

        //notify all in the room about new leader
        broadcast(room, {
          type: "roleUpdate",
          newPlayer: newLeader,
          gameState: room.gameState,
          leaderId: room.leaderId,
        });
      } else {
        room.leaderId = -1;
      }
    }

    // ---- case: disconnect during countdown ----
    if (room.game.state !== 2 && room.game.state !== 3) {
      cancelCountdown(room);
    }

    // ---- case: leave before game start / game ended ----
    if (room.game.state !== 2 && room.game.state !== 3) {
      console.log(
        `Player ${player.playerName} (${role}) [ ${clientId} ] left the room ${room.name} (${roomId}).`,
      );
      // broadcast(room, createLiveChatMessage(-1, "system", `${player.playerName} left.`));

      //remove player from team
      if (role && role !== "spectator") {
        room.gameState.teams.left = room.gameState.teams.left.filter(
          (p: playerInfo) => p.role !== role,
        );
        room.gameState.teams.right = room.gameState.teams.right.filter(
          (p: playerInfo) => p.role !== role,
        );
        room.clientRoles.delete(clientId);
      }

      //remove room if no player
      const totalPlayers =
        room.gameState.teams.left.length + room.gameState.teams.right.length;
      if (totalPlayers === 0) {
        console.log(`No players left, deleting room ${room.name} (${roomId})`);
        rooms.delete(room.id);
        return;
      }

      //notify all client about the game is finish and player leave
      const playerInfo = room.clientRoles.get(clientId);
      broadcast(room, {
        type: "roleUpdate",
        newPlayer: playerInfo,
        gameState: room.gameState,
        leaderId: room.leaderId,
      });
      return;
    }
  }
}
