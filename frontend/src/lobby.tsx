import { useEffect, useRef, useState } from "react";
import { fetchRooms, fetchMatches, createRoomAPI, ensureClientId} from "./utils"
import { BASE_WIDTH, BASE_HEIGHT } from "./constants";

export default function Lobby({ onEnterRoom }: { onEnterRoom: (id:string, name:string, leaderId:string)=>void }) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
	const [createStep, setCreateStep] = useState<1 | 2>(1); // 1: choose type, 2: enter name
    const [teamSize, setTeamSize] = useState(1);
    const [roomName, setRoomName] = useState("");
    const [error, setError] = useState("");
	const [showJoinPopup, setShowJoinPopup] = useState(false);
	const [showPrivateJoin, setShowPrivateJoin] = useState(false);
	const [joinRoomId, setJoinRoomId] = useState("");
	const [joinError, setJoinError] = useState("");
	const [showQuickJoin, setShowQuickJoin] = useState(false);
    const roomsInterval = useRef<number | null>(null);
    const matchesInterval = useRef<number | null>(null);

	async function quickJoinRoom(teamSize: number) {
		// step 1: Fetch rooms that match the team size and are not started
		const roomsList = await fetchRooms();
		let room = roomsList.find(
			(r: any) =>
				r.teamSize === teamSize &&
				!r.gameStarted &&
				(r.leftPlayers + r.rightPlayers) < r.teamSize * 2 &&
                r.private === false
		);
        console.log("Quick join found room:", roomsList);

	  //step 2: If no room existm create new room
	  if (!room) {
	    const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT, 1);
	    const width = BASE_WIDTH * scale;
	    const height = BASE_HEIGHT * scale;
		room = await createRoomAPI(teamSize, `Public ${teamSize}v${teamSize}`, width, height, { isPrivate: false });

		if (!room) {
			alert ("Failed to create public room");
			setShowQuickJoin(false);
			return;
		}
	  }

	  // step 3: join the room
	  const roomId = room.roomId || room.id; // backend returns either roomId or id
	  sessionStorage.setItem("pongRoomId", roomId);
	  sessionStorage.setItem("pongRoomName", room.name);
	  onEnterRoom(roomId, room.name, room.leaderId || "");
	  setShowQuickJoin(false);
	}

	// call create room API
    async function CreatePrivateRoom() {
        setError("");

		// step 1: check room name
        if (!roomName.trim()) {
            setError("Room name is required");
            return;
        }

		// step 2: create room
        const clientId = sessionStorage.getItem("pongClientId") || ensureClientId();
        const scale = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT, 1);
        const scaledWidth = BASE_WIDTH * scale;
        const scaledHeight = BASE_HEIGHT * scale;

        const room = await createRoomAPI(teamSize, roomName, scaledWidth, scaledHeight, { leaderId: clientId, isPrivate: true });
        if (room) {
            sessionStorage.setItem("pongRoomId", room.roomId);
            sessionStorage.setItem("pongRoomName", room.name);
            onEnterRoom(room.roomId, room.name, room.leaderId);
            setShowModal(false);
            setRoomName("");
            setTeamSize(1);
        } else {
            setError("Failed to create room");
        }
    }

    useEffect(() => { ensureClientId(); }, []);

	// Refresh room list every 2 seconds
    useEffect(() => {
        async function refresh() {
            const fetchedRooms = await fetchRooms(); ////debug
            console.log("Fetched rooms:", fetchedRooms.map((r: any) => r.id));
            setRooms(await fetchRooms());
        }
        refresh();
        roomsInterval.current = window.setInterval(refresh, 2000);
        return () => { if (roomsInterval.current) clearInterval(roomsInterval.current); };
    }, []);

	// Refresh match history every 5 seconds
    useEffect(() => {
        async function refresh() { setMatches(await fetchMatches(10)); }
        refresh();
        matchesInterval.current = window.setInterval(refresh, 5000);
        return () => { if (matchesInterval.current) clearInterval(matchesInterval.current); };
    }, []);

    return (
      <div className="p-6">
        <h1 className="text-3xl mb-4">Pong Lobby</h1>

		{/* Create Button */}
        <div className="mb-4">
          <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-black" onClick={()=>setShowModal(true)}>Create</button>
        </div>

        {/* Modal */}
		{showModal && (
		  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
		    <div className="bg-white p-6 rounded shadow-lg w-80 relative">
		      {/* Cancel "X" */}
		      <button
		        className="absolute top-2 right-2 text-gray-500 hover:text-black"
		        onClick={() => {
		          setShowModal(false);
		          setCreateStep(1); // reset
		          setRoomName("");
		          setTeamSize(1);
				  setError("");
		        }}
		      >
		        ✕
		      </button>

		      {createStep === 1 && (
		        <>
		          <h2 className="text-xl mb-4">Choose Game Type</h2>
		          <div className="flex flex-col gap-3">
		            <button
		              className="px-3 py-2 bg-blue-500 text-white rounded"
		              onClick={() => {
		                setTeamSize(1);
		                setCreateStep(2);
		              }}
		            >
		              1 vs 1
		            </button>
		            <button
		              className="px-3 py-2 bg-green-500 text-white rounded"
		              onClick={() => {
		                setTeamSize(2);
		                setCreateStep(2);
		              }}
		            >
		              2 vs 2
		            </button>
		          </div>
		        </>
		      )}

		      {createStep === 2 && (
		        <>
		          <h2 className="text-xl mb-4">Room Name</h2>
		          {error && <div className="text-red-600 mb-2">{error}</div>}
		          <input
		            type="text"
		            value={roomName}
		            onChange={(e) => setRoomName(e.target.value)}
		            className="w-full border px-2 py-1 rounded mb-3"
		            placeholder="Enter room name"
		          />

		          <div className="flex justify-between mt-4">
		            <button
		              className="px-3 py-1 border rounded"
		              onClick={() => {
						setCreateStep(1);
						setError("");
					  }} // back to game type
		            >
		              Back
		            </button>
		            <button
		              className="px-3 py-1 bg-blue-500 text-white rounded"
		              onClick={CreatePrivateRoom}
		            >
		              Create
		            </button>
		          </div>
		        </>
		      )}
		    </div>
		  </div>
		)}


		{/* Join Button */}
		<button
		  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-black"
		  onClick={() => setShowJoinPopup(true)}
		>
		  Join
		</button>

		{/* Show popout join */}
		{showJoinPopup && (
		  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
		    <div className="bg-white p-6 rounded shadow-lg w-80 relative">
		      {/* Cancel "X" */}
		      <button
		        className="absolute top-2 right-2 text-gray-500 hover:text-black"
		        onClick={() => setShowJoinPopup(false)}
		      >
		        ✕
		      </button>

		      <h2 className="text-xl mb-4">Join Options</h2>
		      <div className="flex flex-col gap-2">
		        <button
		          className="px-3 py-1 bg-blue-500 text-white rounded"
		          onClick={() => {
		            setShowJoinPopup(false);
		            setShowQuickJoin(true);
		          }}
		        >
		          Quick Join
		        </button>
		        <button
		          className="px-3 py-1 bg-green-500 text-white rounded"
		          onClick={() => {
		            setShowPrivateJoin(true);
		          }}
		        >
		          Join Private Room
		        </button>
		      </div>
		    </div>
		  </div>
		)}


		{/* Join Private Room Modal */}
		{showPrivateJoin && (
		  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
		    <div className="bg-white p-6 rounded shadow-lg w-80 relative">
		      {/* Cancel "X" */}
		      <button
		        className="absolute top-2 right-2 text-gray-500 hover:text-black"
		        onClick={() => {
		          setShowPrivateJoin(false);
		          setShowJoinPopup(true);
				  setJoinRoomId("");
				  setJoinError("");
		        }}
		      >
		        ✕
		      </button>

		      <h2 className="text-xl mb-4">Enter Room ID</h2>
		      <input
		        type="text"
		        placeholder="Room ID"
		        value={joinRoomId}
		        onChange={(e) => setJoinRoomId(e.target.value)}
		        className="w-full px-2 py-1 border rounded mb-2"
		      />
		      {joinError && <div className="text-red-600 mb-2">{joinError}</div>}
		      <div className="flex justify-end gap-2">
		        <button
		          className="px-3 py-1 border rounded"
		          onClick={() => {
		            setShowPrivateJoin(false);
		            setShowJoinPopup(true);
					setJoinRoomId("");
					setJoinError("");
		          }}
		        >
		          Back
		        </button>
		        <button
		          className="px-3 py-1 bg-green-500 text-white rounded"
		          onClick={async () => {
		            setJoinError("");
		            const rooms = await fetchRooms();
		            const room = rooms.find((r: any) => r.id === joinRoomId.trim());
		            if (!room) {
						setJoinError("Room not found");
		            	return;
		            } else if (room.leftPlayers + room.rightPlayers >= room.teamSize * 2) {
		            	setJoinError("Room is full");
		            	return;
		            }
		            sessionStorage.setItem("pongRoomId", room.id);
		            sessionStorage.setItem("pongRoomName", room.name);
		            onEnterRoom(room.id, room.name, room.leaderId);
		            setShowPrivateJoin(false);
					setJoinRoomId("");
					setJoinError("");
		          }}
		        >
		          Join Room
		        </button>
		      </div>
		    </div>
		  </div>
		)}

		{/* Quick Join Modal */}
		{showQuickJoin && (
		  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
		    <div className="bg-white p-6 rounded shadow-lg w-80 relative">
		      {/* Cancel "X" */}
		      <button
		        className="absolute top-2 right-2 text-gray-500 hover:text-black"
		        onClick={() => {
		          setShowQuickJoin(false);
		          setShowJoinPopup(true); // go back instead of closing everything
		        }}
		      >
		        ✕
		      </button>

		      <h2 className="text-xl mb-4">Quick Join</h2>
		      <div className="flex flex-col gap-2">
		        <button
		          className="px-3 py-1 bg-blue-500 text-white rounded"
		          onClick={() => quickJoinRoom(1)}
		        >
		          1 vs 1
		        </button>
		        <button
		          className="px-3 py-1 bg-blue-500 text-white rounded"
		          onClick={() => quickJoinRoom(2)}
		        >
		          2 vs 2
		        </button>
		        <button
		          className="px-3 py-1 border rounded"
		          onClick={() => {
		            setShowQuickJoin(false);
		            setShowJoinPopup(true); // go back to join options
		          }}
		        >
		          Back
		        </button>
		      </div>
		    </div>
		  </div>
		)}


        {/* Room List */}
        <div id="roomList" className="mb-6">
          <h2 className="text-xl mb-2">Rooms (visualize purpose)</h2>
          <div className="space-y-2">
            {rooms.filter(r => !r.gameEnded).filter(r => (r.leftPlayers + r.rightPlayers) > 0).map((r:any)=> (
              <div key={r.id} className="flex items-center justify-between border p-4 rounded shadow-sm bg-white">
                {/* Room Info */}
                <div>
                  <div className="font-semibold">{r.name} (id: {r.id})</div>
                  <div className="text-sm text-gray-600">
                    {r.leftPlayers + r.rightPlayers}/{r.teamSize * 2} players {r.gameStarted ? "(playing)" : "(waiting)"}
                  </div>
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
