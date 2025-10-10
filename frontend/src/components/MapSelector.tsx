import React from "react";
import { useTranslation } from "react-i18next";

import Button from "./Button";
import Subheader from "./Subheader";

interface MapSelectorProps {
  selectedMap: string;
  maps: string[];
  onMapChange: (map: string) => void;
  label: string;
}

const MapSelector: React.FC<MapSelectorProps> = ({
  selectedMap,
  maps,
  onMapChange,
  label,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`MapSelector.${key}`);
  const currentIndex = maps.indexOf(selectedMap);

  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : maps.length - 1;
    onMapChange(maps[newIndex]);
  };

  const handleNext = () => {
    const newIndex = currentIndex < maps.length - 1 ? currentIndex + 1 : 0;
    onMapChange(maps[newIndex]);
  };

  return (
    <>
      <Subheader>{label}</Subheader>
      <div className="w-full flex-row-center gap-8">
        <Button variant="mapSelector" onClick={handlePrevious} className="pr-1">
          {/* < */}
          &#8249;
        </Button>

        <div className="flex-1 text-center">
          <p className="text-yellow-400 text-2xl font-bold">
            {translate(selectedMap)}
          </p>
        </div>

        <Button variant="mapSelector" onClick={handleNext} className="pl-1">
          {/* › */}
          &#8250;
        </Button>
      </div>

      <div className="w-full h-50 bg-white rounded-lg flex-row-center border-4 border-brown">
        <img
          src={`/assets/${selectedMap}.png`}
          alt={selectedMap}
          className="h-full bg-input-gray"
        />
      </div>
    </>
  );
};

export default MapSelector;
