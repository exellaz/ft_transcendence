import { useState } from "react";
import { roomSetting } from "./utils.tsx";

interface RoomSettingsFormProps {
  roomId: string;
  isLeader: boolean;
}

export default function RoomSettingsForm({ roomId, isLeader }: RoomSettingsFormProps) {
  const [ballSpeed, setBallSpeed] = useState<number>(10);
  const [paddleHeight, setPaddleHeight] = useState<number>(180);
  const [paddleWidth, setPaddleWidth] = useState<number>(10);
  const [ballSize, setBallSize] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await roomSetting(roomId, ballSpeed, paddleHeight, paddleWidth, ballSize);
      alert("Room settings updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  if (!isLeader) return null; // only leader can see settings

 return (
    <form onSubmit={handleSubmit} className="border rounded p-4 my-4">
      <h3 className="text-lg font-semibold mb-2">Room Settings</h3>

      <div className="space-y-4">
        {/* Ball Speed */}
        <div>
          <label className="block font-medium">Ball Speed</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={1}
              max={100}
              value={ballSpeed}
              onChange={(e) => setBallSpeed(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={ballSpeed}
              onChange={(e) => setBallSpeed(Number(e.target.value))}
              className="w-16 border px-1"
            />
          </div>
        </div>

        {/* Paddle Height */}
        <div>
          <label className="block font-medium">Paddle Height</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={20}
              max={300}
              value={paddleHeight}
              onChange={(e) => setPaddleHeight(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={20}
              max={300}
              value={paddleHeight}
              onChange={(e) => setPaddleHeight(Number(e.target.value))}
              className="w-16 border px-1"
            />
          </div>
        </div>

        {/* Paddle Width */}
        <div>
          <label className="block font-medium">Paddle Width</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={5}
              max={50}
              value={paddleWidth}
              onChange={(e) => setPaddleWidth(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={5}
              max={50}
              value={paddleWidth}
              onChange={(e) => setPaddleWidth(Number(e.target.value))}
              className="w-16 border px-1"
            />
          </div>
        </div>

        {/* Ball Size */}
        <div>
          <label className="block font-medium">Ball Size</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={10}
              max={50}
              value={ballSize}
              onChange={(e) => setBallSize(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              min={10}
              max={50}
              value={ballSize}
              onChange={(e) => setBallSize(Number(e.target.value))}
              className="w-16 border px-1"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 px-2 py-1 border rounded bg-blue-500 text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
