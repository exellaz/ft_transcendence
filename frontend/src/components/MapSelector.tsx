import React from "react";

interface MapSelectorProps {
  selectedMap: string;
  maps: string[];
  onMapChange: (map: string) => void;
  className?: string;
}

const MapSelector: React.FC<MapSelectorProps> = ({
  selectedMap,
  maps,
  onMapChange,
  className = "",
}) => {
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
    <div className={`w-full flex-col-center gap-6 ${className}`}>
      <div className="w-full flex-row-center gap-8">
        <button
          onClick={handlePrevious}
          className="w-12 h-12 flex-row-center bg-brown hover:bg-yellow-400 hover:text-black text-white rounded-full transition-all duration-200 hover:scale-110"
          type="button"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <p className="text-yellow-400 text-2xl font-bold">{selectedMap}</p>
        </div>

        <button
          onClick={handleNext}
          className="w-12 h-12 flex-row-center bg-brown hover:bg-yellow-400 hover:text-black text-white rounded-full transition-all duration-200 hover:scale-110"
          type="button"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className="w-full h-48 bg-white rounded-lg flex-row-center border-4 border-brown">
        <p className="text-gray-500 text-lg font-medium">
          preview of map and game settings in action
        </p>
      </div>
    </div>
  );
};

export default MapSelector;
