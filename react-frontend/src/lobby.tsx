import { useEffect, useRef, useState } from "react";
import { fetchRooms, fetchMatches, createRoomAPI, ensureClientId} from "./utils"
import { BASE_WIDTH, BASE_HEIGHT } from "./constants";
import Chat from "./chat";

export default function Lobby({ onEnterRoom }: { onEnterRoom: (id:string, name:string, leaderId:string)=>void }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const roomsInterval = useRef<number | null>(null);
  const matchesInterval = useRef<number | null>(null);

  useEffect(() => { ensureClientId(); }, []);

  useEffect(() => {
    async function refresh() {
      setRooms(await fetchRooms());
    }
    refresh();
    roomsInterval.current = window.setInterval(refresh, 2000);
    return () => { if (roomsInterval.current) clearInterval(roomsInterval.current); };
  }, []);

  useEffect(() => {
    async function refresh() {
      setMatches(await fetchMatches(10));
    }
    refresh();
    matchesInterval.current = window.setInterval(refresh, 5000);
    return () => { if (matchesInterval.current) clearInterval(matchesInterval.current); };
  }, []);

  async function onCreateRoom() {
    let teamSize = 0;
    // keep asking until 1 or 2
    while (teamSize < 1 || teamSize > 2) {
      const ans = prompt("Enter team size (1-2):", "0") || "0";
      teamSize = parseInt(ans);
      if (teamSize >=1 && teamSize <=2) break;
    }
    let roomName = "";
    while (!roomName) {
      roomName = prompt("Enter room name:") || "";
      if (!roomName) alert("Room name is required!");
    }

    const clientId = sessionStorage.getItem("pongClientId") || ensureClientId();
    const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT, 1);
    const scaledWidth = BASE_WIDTH * scale;
    const scaledHeight = BASE_HEIGHT * scale;

    const room = await createRoomAPI(teamSize, roomName, clientId, scaledWidth, scaledHeight);
    if (room) {
      sessionStorage.setItem("pongRoomId", room.roomId);
      sessionStorage.setItem("pongRoomName", room.name);
      onEnterRoom(room.roomId, room.name, room.leaderId);
    } else {
      alert("Failed to create room");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl mb-4">Pong Lobby</h1>
      <div className="mb-4">
        <button className="px-3 py-1 border" onClick={onCreateRoom}>Create Room</button>
      </div>

      <div id="roomList" className="mb-6">
        <h2 className="text-xl mb-2">Rooms</h2>
        <div className="space-y-2">
          {rooms.filter(r => (r.leftPlayers + r.rightPlayers) > 0).map((r:any)=> (
            <div key={r.id} className="flex items-center justify-between border p-2 rounded">
              <div>{r.name} — {r.leftPlayers + r.rightPlayers}/{r.teamSize*2} players {r.gameStarted ? "(playing)" : "(waiting)"}</div>
              <div>
                <button className="mr-2 px-2" onClick={()=>onEnterRoom(r.id, r.name, r.leaderId)}>Join</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="matchHistory" className="mt-6">
        <h2 className="text-xl">Recent Matches</h2>
        <div className="overflow-auto max-h-72 mt-2">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100"><th>Name</th><th>Room</th><th>Score</th><th>Winner</th><th>Duration</th><th>Players</th></tr>
            </thead>
            <tbody>
              {matches.map((m:any, i:number) => (
                <tr key={i} className="border-t">
                  <td><strong>{m.name}</strong></td>
                  <td>{m.room_id}</td>
                  <td>{m.score_left} - {m.score_right}</td>
                  <td>{m.winner}</td>
                  <td>{m.duration}s</td>
                  <td>
                    <table className="w-full">
                      <tbody>
                        {m.players.map((p:any, j:number) => (
                          <tr key={j}><td>{p.player_id}</td><td>{p.team}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
