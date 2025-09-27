import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import Header from "../components/Header";
import MapSelector from "../components/MapSelector";
import PopupCard from "../components/PopupCard";
import Slider from "../components/Slider";
import { useRoomSettings } from "./gameSetting.api";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

const GameSettingsPopup: React.FC<PopupProps> = ({ open, onClose, roomId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameSettingsPopup.${key}`);

  // Game settings state
  // fetch settings from API
  const { settings, setSettings, loading, saving, saveSettings, resetSettings } =
    useRoomSettings(roomId);

  const maps = ["stadium", "mansion", "arcade"];

  // handle reset (restore backend defaults)
  const handleReset = () => {
    resetSettings();
  };

  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
    }
  };

  if (loading || !settings) {
    return (
      <PopupCard size="large" open={open} onClose={onClose}>
        <Header>{translate("header")}</Header>
        <div className="flex-col-center h-full">{translate("loading")}</div>
      </PopupCard>
    );
  }


  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-row-start gap-15 px-10">
        {/* Left side - Sliders */}
        <div className="h-full flex-1 flex-col-center gap-6">
          <Slider
            label={translate("ball_speed")}
            value={settings.ballSpeed}
            options={[
                { label: translate("slow"), value: 1 },
                { label: translate("normal"), value: 5 },
                { label: translate("fast"), value: 10 },
            ]}
            onChange={(value) => setSettings({ ...settings, ballSpeed: value })}
          />
          <Slider
            label={translate("ball_size")}
            value={settings.ballSize}
            options={[
                { label: translate("small"), value: 5 },
                { label: translate("normal"), value: 10 },
                { label: translate("big"), value: 20 },
            ]}
            onChange={(value) => setSettings({ ...settings, ballSize: value })}
          />
          <Slider
            label={translate("paddle_speed")}
            value={settings.paddleSpeed}
            options={[
                { label: translate("slow"), value: 1 },
                { label: translate("normal"), value: 3 },
                { label: translate("fast"), value: 10 },
            ]}
            onChange={(value) => setSettings({ ...settings, paddleSpeed: value })}
          />
        </div>
        {/* Right side - Map Selection */}
        <div className="h-full flex-1 flex-col-center gap-6">
          <MapSelector
            selectedMap={settings.map}
            maps={maps}
            onMapChange={(map) => setSettings({ ...settings, map })}
            label={translate("choose_map")}
          />
        </div>
      </div>
      <div className="flex-row-center gap-6">
        <Button onClick={handleReset}>{translate("restore_default")}</Button>
        <Button variant="green" onClick={handleSave} disabled={saving}>
          {saving ? translate("saving") : translate("save_changes")}
        </Button>
      </div>
    </PopupCard>
  );
};

export default GameSettingsPopup;
