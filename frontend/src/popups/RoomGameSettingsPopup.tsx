import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import Header from "../components/Header";
import MapSelector from "../components/MapSelector";
import PopupCard from "../components/PopupCard";
import Slider from "../components/Slider";
import { useGameSettings } from "../lib/gameSetting.api";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
}

const RoomGameSettingsPopup: React.FC<PopupProps> = ({
  open,
  onClose,
  roomId,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameSettingsPopup.${key}`);

  // ------------------------------------------ API -----------------------------------------------------
  // fetch settings from API
  const {
    settings,
    setSettings,
    loading,
    saving,
    saveSettings,
    resetSettings,
  } = useGameSettings(roomId);
  // available maps
  const maps = ["stadium", "mansion", "arcade"];

  // ----------------------------------------- Helper Functions -----------------------------------------
  // handle reset (restore backend defaults)
  const handleReset = () => {
    resetSettings();
  };

  // handle save (send to backend)
  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
      onClose();
    }
  };

  // loading state
  if (loading || !settings) {
    return (
      <PopupCard size="large" open={open} onClose={onClose}>
        <Header>{translate("header")}</Header>
        <div className="flex-col-center h-full">{translate("loading")}</div>
      </PopupCard>
    );
  }

  // ----------------------------------------- Render -------------------------------------------------
  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-row-start gap-15 px-10">
        {/* Left side - Sliders */}
        <div className="h-full flex-1 flex-col-center gap-6">
          {/* ball speed */}
          <Slider
            label={translate("ball_speed")}
            value={settings.ballSpeed}
            options={[
              { label: translate("slow"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("fast"), value: 2 },
            ]}
            onChange={(value) => setSettings({ ...settings, ballSpeed: value })}
          />
          {/* ball size */}
          <Slider
            label={translate("ball_size")}
            value={settings.ballSize}
            options={[
              { label: translate("small"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("big"), value: 2 },
            ]}
            onChange={(value) => setSettings({ ...settings, ballSize: value })}
          />
          {/* paddle speed */}
          <Slider
            label={translate("paddle_speed")}
            value={settings.paddleSpeed}
            options={[
              { label: translate("slow"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("fast"), value: 2 },
            ]}
            onChange={(value) =>
              setSettings({ ...settings, paddleSpeed: value })
            }
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
      {/* Buttons */}
      <div className="flex-row-center gap-6">
        {/* reset */}
        <Button onClick={handleReset}>{translate("restore_default")}</Button>
        {/* save */}
        <Button variant="green" onClick={handleSave} disabled={saving}>
          {saving ? translate("saving") : translate("save_changes")}
        </Button>
      </div>
    </PopupCard>
  );
};

export default RoomGameSettingsPopup;
