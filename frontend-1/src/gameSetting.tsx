import { useEffect, useState } from "react";
import { roomSetting } from "./utils.tsx";

interface RoomSettingsFormProps {
  roomId: string;
  isLeader: boolean;
}

export default function RoomSettingsForm({ roomId, isLeader }: RoomSettingsFormProps) {
  const [ballSpeed, setBallSpeed] = useState<number | null>(null);
  const [paddleHeight, setPaddleHeight] = useState<number | null>(null);
  const [paddleWidth, setPaddleWidth] = useState<number | null>(null);
  const [ballSize, setBallSize] = useState<number | null>(null);
  const [paddleSpeed, setPaddleSpeed] = useState<number | null>(null);
  const [scorePoint, setScorePoint] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  //fetch the default setting from backend
  useEffect(() => {
	async function fetchRoomSetting() {
		try {
			const res = await fetch(import.meta.env.VITE_API_URL + `/room/${roomId}`);
			if (!res.ok) throw new Error("Failed to fetch room data");
			const data = await res.json();
			console.log("Fetch setting response:", data.setting); ////debug
			setBallSpeed(data.setting.ballSpeed);
			setPaddleHeight(data.setting.paddleHeight);
			setPaddleWidth(data.setting.paddleWidth);
			setBallSize(data.setting.ballSize);
			setPaddleSpeed(data.setting.paddleSpeed);
			setScorePoint(data.setting.scorePoint);
		} catch (err) {
			console.error(err);
		}
	}
	fetchRoomSetting();
  }, [roomId]);

  // Handle setting submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
	if (ballSpeed === null || paddleHeight === null || paddleWidth === null || ballSize === null || paddleSpeed === null || scorePoint === null) return;
    setSaving(true);
    try {
      await roomSetting(roomId, ballSpeed, paddleHeight, paddleWidth, ballSize, paddleSpeed, scorePoint);
	  setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  if (!isLeader) return null; // only leader can see settings

 return (
    <>
      {/* Button to open modal */}
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700"
      >
        Open Settings
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Room Settings</h3>

            {ballSpeed === null || paddleHeight === null || paddleWidth === null || ballSize === null || paddleSpeed === null || scorePoint === null ? (
              <div>Loading settings...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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

				{/* Paddle Speed */}
                <div>
                  <label className="block font-medium">Paddle Speed</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={paddleSpeed}
                      onChange={(e) => setPaddleSpeed(Number(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={paddleSpeed}
                      onChange={(e) => setPaddleSpeed(Number(e.target.value))}
                      className="w-16 border px-1"
                    />
                  </div>
                </div>

				{/* Score Point */}
                <div>
                  <label className="block font-medium">Score Point</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={scorePoint}
                      onChange={(e) => setScorePoint(Number(e.target.value))}
                      className="w-16 border px-1"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-1 border rounded bg-gray-300 hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1 border rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
