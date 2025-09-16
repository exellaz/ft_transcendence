const API_URL = `http://${window.location.hostname}:4242`;
//const API_URL = `/api`;

/**
 * @brief generate a random client ID and store it in session storage if not already present
 * @return client ID to client
*/
export function ensureClientId() {
  let clientId = sessionStorage.getItem("pongClientId");
  if (!clientId) {
    clientId = "P" + Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
    sessionStorage.setItem("pongClientId", clientId);
  }
  return clientId;
}

/**
 * @brief fetch the list of available rooms from the backend
 * @return list of rooms to client in JSON format
*/
export async function fetchRooms() {
  try {
    const res = await fetch(`${API_URL}/rooms`);
    if (!res.ok) throw new Error("Failed to fetch rooms");
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch rooms:", error);
    return [];
  }
}

/**
 * @brief fetch the list of recent matches from the backend
 * @return list of matches to client in JSON format
*/
export async function fetchMatches(limit = 10) {
  try {
    const res = await fetch(`${API_URL}/matches?limit=${limit}`);
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
 * @return room details to client in JSON format
 * @note it also send the room details to the backend
*/
export async function createRoomAPI(teamSize: number, roomName: string, leaderId: string, width: number, height: number) {
  try {
    const res = await fetch(`${API_URL}/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamSize, name: roomName, leaderId, width, height }),
    });
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
export async function determineSide(roomId: string): Promise<"left" | "right"> {
  const rooms = await fetchRooms();
  const room = rooms.find((r: any) => r.id === roomId);
  if (!room) return "left";
  return room.leftPlayers <= room.rightPlayers ? "left" : "right";
}

/**
 * @brief update the settings of a room
 * @param roomId ID of the room
 * @param ballSpeed speed of the ball
 * @param paddleHeight height of the paddle
 * @param paddleWidth width of the paddle
 * @param ballSize size of the ball
 * @return updated room settings to client in JSON format
 * @note it also sends the updated settings to the backend
*/
export async function roomSetting(roomId:string, ballSpeed: number, paddleHeight: number, paddleWidth: number, ballSize: number) {
  try {
    const res = await fetch( `${API_URL}/room/${roomId}/setting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ballSpeed, paddleHeight, paddleWidth, ballSize }),
    });

    if (!res.ok) throw new Error("Failed to update room settings");
    return await res.json();
  } catch (error) {
    console.error("Failed to update room settings:", error);
    return null;
  }
}
