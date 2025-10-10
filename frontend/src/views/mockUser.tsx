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
  open?: boolean;
  onClose?: () => void;
}

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

  // Start with empty name + sprite
  const defaultInfo: PlayerInfo = {
    id: clientId,
    name: "",
    sprite: "",
  };
  sessionStorage.setItem("playerInfo", JSON.stringify(defaultInfo));
  return defaultInfo;
}

const ChoosePlayer: React.FC<ChoosePlayerProps> = ({
  open = true,
  onClose,
}) => {
  const navigate = useNavigate();
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(loadPlayer());

  // persist to sessionStorage whenever changed
  useEffect(() => {
    sessionStorage.setItem("playerInfo", JSON.stringify(playerInfo));
  }, [playerInfo]);

  if (!open) return null;

  function handleDone() {
    if (!playerInfo.name.trim() || !playerInfo.sprite) return; // safety check
    if (onClose) onClose();
    navigate("/main-menu");
  }

  const isValid = playerInfo.name.trim() !== "" && playerInfo.sprite !== "";

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-2xl p-6 w-[400px] shadow-lg">
        <h2 className="text-xl font-bold mb-4">
          Mock Player (will be deleted after login done)
        </h2>

        {/* Name input */}
        <label className="block mb-2">Name:</label>
        <input
          type="text"
          className="w-full border rounded p-2 mb-2"
          placeholder="Enter your name..."
          value={playerInfo.name}
          onChange={(e) =>
            setPlayerInfo({ ...playerInfo, name: e.target.value })
          }
        />
        {!playerInfo.name.trim() && (
          <p className="text-red-500 text-sm mb-2">Name is required</p>
        )}

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
        {!playerInfo.sprite && (
          <p className="text-red-500 text-sm mt-2">Sprite is required</p>
        )}

        {/* Preview */}
        {isValid && (
          <div className="mt-4 text-center">
            <p>
              Selected: <b>{playerInfo.name}</b>
            </p>
            <img
              src={playerInfo.sprite}
              alt="preview"
              className="mx-auto w-12 h-12"
            />
          </div>
        )}

        {/* Done button */}
        <div className="mt-6 flex justify-end">
          <Button
            variant="bigYellow"
            onClick={handleDone}
            disabled={!isValid} // only enabled if both chosen
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChoosePlayer;
