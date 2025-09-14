import { useEffect, useRef, useState } from "react";
import { fetchRooms, fetchMatches, createRoomAPI, ensureClientId} from "./utils"
import { BASE_WIDTH, BASE_HEIGHT } from "./constants";

export default function Lobby({ onEnterRoom }: { onEnterRoom: (id:string, name:string, leaderId:string)=>void }) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [teamSize, setTeamSize] = useState(0);
    const [roomName, setRoomName] = useState("");
    const [error, setError] = useState("");
    const roomsInterval = useRef<number | null>(null);
    const matchesInterval = useRef<number | null>(null);

    useEffect(() => { ensureClientId(); }, []);

    useEffect(() => {
        async function refresh() { setRooms(await fetchRooms()); }
        refresh();
        roomsInterval.current = window.setInterval(refresh, 2000);
        return () => { if (roomsInterval.current) clearInterval(roomsInterval.current); };
    }, []);

    useEffect(() => {
        async function refresh() { setMatches(await fetchMatches(10)); }
        refresh();
        matchesInterval.current = window.setInterval(refresh, 5000);
        return () => { if (matchesInterval.current) clearInterval(matchesInterval.current); };
    }, []);

    async function onCreateRoom() {
        setError("");
        if (!roomName.trim()) {
            setError("Room name is required");
            return;
        }
        if (teamSize < 1 || teamSize > 2) {
            setError("Team size must be 1 or 2");
            return;
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
            setShowModal(false);
            setRoomName("");
            setTeamSize(0);
        } else {
            setError("Failed to create room");
        }
    }

    return (
      <div className="p-6">
        <h1 className="text-3xl mb-4">Pong Lobby</h1>
        <div className="mb-4">
          <button className="px-3 py-1 border" onClick={()=>setShowModal(true)}>Create Room</button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-lg w-80">
              <h2 className="text-xl mb-4">Create Room</h2>
              {error && <div className="text-red-600 mb-2">{error}</div>}
              <div className="mb-3">
                <label className="block mb-1">Room Name:</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div className="mb-3">
                <label className="block mb-1">Team Size (1-2):</label>
                <input
                  type="number"
                  min={1}
                  max={2}
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                  onClick={onCreateRoom}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room List */}
        <div id="roomList" className="mb-6">
          <h2 className="text-xl mb-2">Rooms</h2>
          <div className="space-y-2">
            {rooms.filter(r => (r.leftPlayers + r.rightPlayers) > 0).map((r:any)=> (
              <div key={r.id} className="flex items-center justify-between border p-4 rounded shadow-sm bg-white">
                {/* Room Info */}
                <div>
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-sm text-gray-600">
                    {r.leftPlayers + r.rightPlayers}/{r.teamSize * 2} players {r.gameStarted ? "(playing)" : "(waiting)"}
                  </div>
                </div>
                {/* Join Button */}
                <div>
                  <button
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-black"
                    onClick={()=>onEnterRoom(r.id, r.name, r.leaderId)}
                  >
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Match History */}
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