const API_URL = `http://${window.location.hostname}:4242`;

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

export async function determineSide(roomId: string): Promise<"left" | "right"> {
	const rooms = await fetchRooms();
	const room = rooms.find((r: any) => r.id === roomId);
	if (!room) return "left";
	return room.leftPlayers <= room.rightPlayers ? "left" : "right";
}

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
