const API_URL = `http://${window.location.hostname}:4242`;

export async function fetchRooms() {
  const res = await fetch(`${API_URL}/rooms`);
  return await res.json();
}

export async function fetchMatches(limit = 10) {
  try {
    const res = await fetch(`${API_URL}/matches?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch matches");
    return await res.json();
  } catch {
    return [];
  }
}

export async function createRoom(teamSize: number, roomName: string, leaderId: string, width: number, height: number) {
  const res = await fetch(`${API_URL}/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamSize, name: roomName, leaderId, width, height }),
  });
  return await res.json();
}

export async function detemineSide(roomId: string): Promise<"left" | "right"> {
  const rooms = await fetchRooms();
  const room = rooms.find((r: any) => r.id === roomId);
  if (!room) return "left";
  return room.leftPlayers <= room.rightPlayers ? "left" : "right";
}
