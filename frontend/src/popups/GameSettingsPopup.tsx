import React from "react";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import Header from "../components/Header";
import MapSelector from "../components/MapSelector";
import PopupCard from "../components/PopupCard";
import Slider from "../components/Slider";

export interface GameSettings {
  map: string;
  ballSpeed: number;
  ballSize: number;
  paddleSpeed: number;
}

interface PopupProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
}

const GameSettingsPopup: React.FC<PopupProps> = ({
  open,
  onClose,
  settings,
  onChange,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameSettingsPopup.${key}`);

  const maps = ["stadium", "mansion", "arcade"];

  const handleReset = () => {
    onChange({ map: "stadium", ballSpeed: 1, ballSize: 1, paddleSpeed: 1 });
  };

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
              { label: translate("slow"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("fast"), value: 2 },
            ]}
            onChange={(val) => onChange({ ...settings, ballSpeed: val })}
          />
          <Slider
            label={translate("ball_size")}
            value={settings.ballSize}
            options={[
              { label: translate("small"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("big"), value: 2 },
            ]}
            onChange={(val) => onChange({ ...settings, ballSize: val })}
          />
          <Slider
            label={translate("paddle_speed")}
            value={settings.paddleSpeed}
            options={[
              { label: translate("slow"), value: 0 },
              { label: translate("normal"), value: 1 },
              { label: translate("fast"), value: 2 },
            ]}
            onChange={(val) => onChange({ ...settings, paddleSpeed: val })}
          />
        </div>
        {/* Right side - Map Selection */}
        <div className="h-full flex-1 flex-col-center gap-6">
          <MapSelector
            selectedMap={settings.map}
            maps={maps}
            onMapChange={(map) => onChange({ ...settings, map })}
            label={translate("choose_map")}
          />
        </div>
      </div>
      <Button onClick={handleReset}>{translate("restore_default")}</Button>
    </PopupCard>
  );
};

export default GameSettingsPopup;
