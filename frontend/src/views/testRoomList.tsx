import React, { useEffect, useState } from "react";
import { fetchRooms, fetchTournaments } from "../lib/requestBackend.api";

interface Room {
  id: number;
  name: string;
  teamSize: number;
  leftPlayers: number;
  rightPlayers: number;
  gameStarted: boolean;
  gameEnded: boolean;
  private: boolean;
}

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tournament, setTournament] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadRooms(showLoader = false) {
    try {
      const data = await fetchRooms();
      setRooms((prev) => {
        // Only update if data changed
        const jsonPrev = JSON.stringify(prev);
        const jsonNext = JSON.stringify(data);
        return jsonPrev !== jsonNext ? data : prev;
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load rooms.");
    }
  }

  async function loadTournaments(showLoader = false) {
    try {
      const data = await fetchTournaments();
      setTournament((prev) => {
        // Only update if data changed
        const jsonPrev = JSON.stringify(prev);
        const jsonNext = JSON.stringify(data);
        return jsonPrev !== jsonNext ? data : prev;
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load tournaments.");
    }
  }


  useEffect(() => {
    loadRooms(true); // Initial load
    loadTournaments(true);
    const interval = setInterval(() => {
        loadRooms();
        loadTournaments();
    }, 1000); // poll every 1s
    return () => clearInterval(interval);
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;

//  if (rooms.length === 0)
//    return <p className="text-gray-400">No rooms available.</p>;

//  if (tournament.length === 0) {
//    return <p className="text-gray-400">No tournaments available.</p>;
//  }

  return (
    <div className="p-6 w-full max-w-2xl mx-auto flex flex-col gap-4 text-white">
      <h1 className="text-2xl font-bold">Room Status Monitor</h1>
      {rooms.map((room) => (
        <div
          key={room.id}
          className="border border-gray-700 rounded-xl p-4 bg-gray-900/70 transition-all duration-300"
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">
                {room.name} ({room.id})
              </h2>
              <p className="text-sm text-gray-400">
                {room.private ? "🔒 Private" : "🌐 Public"} | Team Size:{" "}
                {room.teamSize}
              </p>
              <p className="text-sm text-gray-400">
                Left: [{room.leftPlayers}] - Right: [{room.rightPlayers}]
              </p>
            </div>

            <div>
              {room.gameEnded ? (
                <span className="text-red-400 font-semibold">● Ended</span>
              ) : room.gameStarted ? (
                <span className="text-green-400 font-semibold">● Started</span>
              ) : (
                <span className="text-yellow-400 font-semibold">● Waiting</span>
              )}
            </div>
          </div>
        </div>
      ))}
        {tournament.map((tour) => (
        <div
          key={tour.id}
          className="border border-gray-700 rounded-xl p-4 bg-gray-900/70 transition-all duration-300"
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-lg">
                {tour.name} ({tour.id})
              </h2>
              <p className="text-sm text-gray-400">
                Players: {tour.players.length}/{tour.maxPlayer} | Stage: {tour.stage === "QF" ? "Quarter Finals" : tour.stage === "SF" ? "Semi Finals" : tour.stage === "F" ? "Finals" : "Unknown"}
              </p>
            </div>
            <div>
                {tour.started ? (
                    <span className="text-green-400 font-semibold">● lock</span>
                ) : (
                    <span className="text-red-400 font-semibold">● unlock</span>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoomList;
