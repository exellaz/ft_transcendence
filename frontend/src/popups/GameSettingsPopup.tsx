import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import Header from "../components/Header";
import MapSelector from "../components/MapSelector";
import PopupCard from "../components/PopupCard";
import Slider from "../components/Slider";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const GameSettingsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameSettingsPopup.${key}`);

  // Game settings state
  const [ballSpeed, setBallSpeed] = useState(2);
  const [ballSize, setBallSize] = useState(2);
  const [paddleSpeed, setPaddleSpeed] = useState(2);
  const [selectedMap, setSelectedMap] = useState(translate("stadium"));
  const [resetToDefault, setResetToDefault] = useState(false);

  const maps = [translate("stadium"), translate("mansion"), translate("arcade")];

  const handleReset = () => {
    setBallSpeed(2);
    setBallSize(2);
    setPaddleSpeed(2);
    setSelectedMap(translate("stadium"));
    setResetToDefault(!resetToDefault);
  };

  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-row-start gap-15 px-10">
        {/* Left side - Sliders */}
        <div className="h-full flex-1 flex-col-center gap-6">
          <Slider
            label={translate("ball_speed")}
            value={ballSpeed}
            options={[translate("slow"), translate("normal"), translate("fast")]}
            onChange={setBallSpeed}
          />
          <Slider
            label={translate("ball_size")}
            value={ballSize}
            options={[translate("small"), translate("normal"), translate("big")]}
            onChange={setBallSize}
          />
          <Slider
            label={translate("paddle_speed")}
            value={paddleSpeed}
            options={[translate("slow"), translate("normal"), translate("fast")]}
            onChange={setPaddleSpeed}
          />
        </div>
        {/* Right side - Map Selection */}
        <div className="h-full flex-1 flex-col-center gap-6">
          <MapSelector
            selectedMap={selectedMap}
            maps={maps}
            onMapChange={setSelectedMap}
            label={translate("choose_map")}
          />
        </div>
      </div>
      <div className="flex-row-center gap-6">
        <Button onClick={handleReset}>{translate("restore_default")}</Button>
        <Button variant="green">{translate("save_changes")}</Button>
      </div>
    </PopupCard>
  );
};

export default GameSettingsPopup;
