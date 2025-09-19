import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import Header from "../components/Header";
import MapSelector from "../components/MapSelector";
import PopupCard from "../components/PopupCard";
import Slider from "../components/Slider";
import Subheader from "../components/Subheader";

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
  const [selectedMap, setSelectedMap] = useState("Map 1");
  const [resetToDefault, setResetToDefault] = useState(false);

  const maps = ["Map 1", "Map 2", "Map 3", "Map 4"];

  const handleReset = () => {
    setBallSpeed(2);
    setBallSize(2);
    setPaddleSpeed(2);
    setSelectedMap("Map 1");
    setResetToDefault(!resetToDefault);
  };

  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-col-center p-10">
        <div className="w-full h-full flex-row-start gap-10">
          {/* Left side - Sliders */}
          <div className="flex-1 flex-col-center gap-8">
            <Slider
              label={translate("ball_speed")}
              value={ballSpeed}
              options={["Slow", "Normal", "Fast"]}
              onChange={setBallSpeed}
            />
            <Slider
              label={translate("ball_size")}
              value={ballSize}
              options={["Small", "Normal", "Large"]}
              onChange={setBallSize}
            />
            <Slider
              label={translate("paddle_speed")}
              value={paddleSpeed}
              options={["Slow", "Normal", "Fast"]}
              onChange={setPaddleSpeed}
            />
          </div>
          {/* Right side - Map Selection */}
          <div className="flex-1 flex-col-center gap-10">
            <Subheader>{translate("choose_map")}</Subheader>
            <MapSelector
              selectedMap={selectedMap}
              maps={maps}
              onMapChange={setSelectedMap}
            />
          </div>
        </div>
        {/* Reset to default checkbox */}
        <div className="w-full flex-row-center gap-3 mt-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex-row-center gap-3 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <div
              className={`w-6 h-6 border-2 border-yellow-400 rounded flex-row-center ${
                resetToDefault ? "bg-yellow-400" : ""
              }`}
            >
              {resetToDefault && <img src="/assets/tick-icon.png" alt="tick" />}
            </div>
            <span className="text-xl font-medium">
              {translate("reset_to_default")}
            </span>
          </button>
        </div>
      </div>
    </PopupCard>
  );
};

export default GameSettingsPopup;
