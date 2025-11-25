import { useEffect, useState } from "react";
import { gameSetting } from "./requestBackend.api";

export function useGameSettings(roomId: string) {
  const [settings, setSettings] = useState<{
    ballSpeed: number;
    ballSize: number;
    paddleSpeed: number;
    scorePoint: number;
    map: string;
  } | null>(null);
  const [initialSettings, setInitialSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          import.meta.env.VITE_API_URL + `/room/${roomId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to fetch room settings");
        const data = await res.json();
        setSettings(data.setting); // user edit
        setInitialSettings(data.setting); // snapshot the default
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [roomId]);

  //handle reset
  function resetSettings() {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }

  // Save
  async function saveSettings(newSettings: typeof settings) {
    if (!newSettings) return;
    setSaving(true);
    try {
      await gameSetting(
        roomId,
        newSettings.ballSpeed,
        newSettings.ballSize,
        newSettings.paddleSpeed,
        newSettings.scorePoint,
        newSettings.map,
      );
      setSettings(newSettings);
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  return {
    settings,
    setSettings,
    loading,
    saving,
    saveSettings,
    resetSettings,
  };
}
