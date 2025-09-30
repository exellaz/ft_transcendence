import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { ensurePlayerId } from "../lib/requestBackend.api.ts";

interface PlayerInfo {
  id: string;
  name: string;
  sprite: string;
}

interface ChoosePlayerProps {
  open?: boolean; // 👈 optional now
  onClose?: () => void;
}

const availableNames = ["alice", "bob", "charlie", "dave", "eve"];
const availableSprites = [
  "../../../assets/green-ghost.png",
  "../../../assets/white-ghost.png",
  "../../../assets/blue-ghost.png",
  "../../../assets/purple-ghost.png",
  "../../../assets/yellow-ghost.png",
];

function loadPlayer(): PlayerInfo {
  const clientId = ensurePlayerId();
  const existing = sessionStorage.getItem("playerInfo");
  if (existing) return JSON.parse(existing);

  const defaultInfo: PlayerInfo = {
    id: clientId,
    name: "player",
    sprite: availableSprites[0],
  };
  sessionStorage.setItem("playerInfo", JSON.stringify(defaultInfo));
  return defaultInfo;
}

const ChoosePlayer: React.FC<ChoosePlayerProps> = ({ open = true, onClose }) => {
  const navigate = useNavigate();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(loadPlayer());

  // persist to sessionStorage whenever changed
  useEffect(() => {
    sessionStorage.setItem("playerInfo", JSON.stringify(playerInfo));
  }, [playerInfo]);

  if (!open) return null;

  function handleDone() {
    if (onClose) onClose(); // optional callback
    navigate("/main-menu"); // 👈 go back to Main Menu
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-lg">
        <h2 className="text-xl font-bold mb-4">Choose Player</h2>

        {/* Name selector */}
        <label className="block mb-2">Name:</label>
        <select
          className="w-full border rounded p-2 mb-4"
          value={playerInfo.name}
          onChange={(e) => setPlayerInfo({ ...playerInfo, name: e.target.value })}
        >
          {availableNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>

        {/* Sprite picker */}
        <label className="block mb-2">Sprite:</label>
        <div className="flex gap-3 flex-wrap">
          {availableSprites.map((sprite) => (
            <img
              key={sprite}
              src={sprite}
              alt="sprite option"
              className={`w-12 h-12 cursor-pointer rounded ${
                playerInfo.sprite === sprite
                  ? "ring-4 ring-yellow-400"
                  : "ring-2 ring-transparent"
              }`}
              onClick={() => setPlayerInfo({ ...playerInfo, sprite })}
            />
          ))}
        </div>

        {/* Preview */}
        <div className="mt-4 text-center">
          <p>
            Selected: <b>{playerInfo.name}</b>
          </p>
          <img src={playerInfo.sprite} alt="preview" className="mx-auto w-12 h-12" />
        </div>

        {/* Done button */}
        <div className="mt-6 flex justify-end">
          <Button variant="bigYellow" onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChoosePlayer;


