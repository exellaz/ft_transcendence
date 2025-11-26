import type { Room } from "../../../backend/src/types/interface";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * @brief generate a random player ID and store it in session storage if not already present
 * @return player ID to client
 */
export function ensurePlayerId() {
  const playerInfo = JSON.parse(sessionStorage.getItem("playerInfo") || "{}");
  let playerId = playerInfo.id;
  if (!playerId) {
    playerId =
      Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
  }
  return playerId;
}

/**
 * @brief fetch the list of available rooms from the backend
 * @return list of rooms to client in JSON format
 */
export async function fetchRooms() {
  try {
    const res = await fetch(`${API_URL}/rooms`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch rooms");
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return [];
  }
}

export async function fetchRoomById(roomId: string) {
  try {
    const res = await fetch(`${API_URL}/room/${roomId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch room");
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch room:", error);
    return null;
  }
}

/**
 * @brief fetch the list of recent matches from the backend
 * @return list of matches to client in JSON format
 */
export async function fetchMatches(limit = 10) {
  try {
    const res = await fetch(`${API_URL}/matches?limit=${limit}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch matches");
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * @brief create a room
 * @param teamSize number of players per team
 * @param roomName name of the room
 * @param leaderId client ID of the room leader
 * @param width game width
 * @param height game height
 * @param options additional options like isPrivate and leaderId ( can be undefined )
 * @return room details to client in JSON format
 * @note it also send the room details to the backend
 */
export async function createRoomAPI(
  teamSize: number,
  roomName: string,
  options?: { leaderId?: number; isPrivate?: boolean },
) {
  //  console.log("Creating room with:", { teamSize, roomName, options }); ////debug
  try {
    const res = await fetch(`${API_URL}/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        teamSize,
        name: roomName,
        leaderId: options?.leaderId,
        isPrivate: options?.isPrivate ?? false,
      }),
    });
    //console.log("Create room response:", res); ////debug
    if (!res.ok) throw new Error("Failed to create room");
    return await res.json();
  } catch (error) {
    console.error("Failed to create room:", error);
    return null;
  }
}

/**
 * @brief determine which side (left or right) a player should join in a room
 * @param roomId ID of the room
 * @return "left" or "right" side to client in Promise format
 * @note it fetches the room details from the backend to make the decision
 */
export async function determineSide(
  roomId: number,
): Promise<"left" | "right" | "unknown"> {
  const rooms = await fetchRooms();
  const room = rooms.find((r: Room) => r.id === roomId);
  if (!room) return "unknown";
  return room.leftPlayers <= room.rightPlayers ? "left" : "right";
}

/**
 * @brief update the settings of a game
 * @param roomId ID of the room
 * @param ballSpeed speed of the ball
 * @param paddleHeight height of the paddle
 * @param paddleWidth width of the paddle
 * @param ballSize size of the ball
 * @param paddleSpeed speed of the paddle
 * @return updated room settings to client in JSON format
 * @note it also sends the updated settings to the backend
 */
export async function gameSetting(
  roomId: string,
  ballSpeed: number,
  ballSize: number,
  paddleSpeed: number,
  scorePoint: number,
  map: string,
) {
  try {
    const res = await fetch(`${API_URL}/room/${roomId}/game-setting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({
        ballSpeed,
        ballSize,
        paddleSpeed,
        scorePoint,
        map,
      }),
    });

    if (!res.ok) throw new Error("Failed to update room settings");
    return await res.json();
  } catch (error) {
    console.error("Failed to update room settings:", error);
    return null;
  }
}

/**
 * @brief create a tournament lobby
 * @param name name of the tournament
 * @return tournament details to client in JSON format
 * @note it also sends the tournament details to the backend
 */
export async function createTournamentLobby(name: string) {
  try {
    const res = await fetch(`${API_URL}/create-tournament`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create tournament");
    return await res.json();
  } catch (error) {
    console.error("Failed to create tournament:", error);
    return null;
  }
}

export async function updateTournamentLobby(
  tournamentId: number,
  maxPlayer: number,
  stage: string,
) {
  try {
    const res = await fetch(`${API_URL}/update-tournament/${tournamentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ maxPlayer, stage }),
    });
    if (!res.ok) throw new Error("Failed to update tournament");
    return await res.json();
  } catch (error) {
    console.error("Failed to update tournament:", error);
    return null;
  }
}

/**
 * @brief fetch the list of available tournaments from the backend
 * @return list of tournaments to client in JSON format
 */
export async function fetchTournaments() {
  try {
    const res = await fetch(`${API_URL}/list-tournaments`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch tournaments");
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch tournaments:", error);
    return [];
  }
}

export async function getTournamentById(tournamentId: number) {
  try {
    const res = await fetch(`${API_URL}/tournament/${tournamentId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });
    if (!res.ok) throw new Error("Failed to fetch tournament");
    const data = await res.json();
    //console.log("fetch tournament: ", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch tournament:", error);
    return null;
  }
}

export async function createNextTournament(
  stage: string,
  parentId: number,
  tournamentDb: { id: number; status: string; createdAt: Date } | null,
) {
  try {
    const res = await fetch(`${API_URL}/create-next-tournament`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: JSON.stringify({ stage, parentId, tournamentDb }),
    });
    if (!res.ok) throw new Error("Failed to create next tournament");
    return await res.json();
  } catch (error) {
    console.error("Failed to create next tournament:", error);
    return null;
  }
}
