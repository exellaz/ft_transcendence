import React from "react";

interface SliderProps {
  label: string;
  value: number;
  options: string[];
  onChange: (value: number) => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  options,
  onChange,
  className = "",
}) => {
  const min = 1;
  const max = options.length;
  const step = 1;
  const percentage = ((value - min) / (max - min)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={`w-full flex-col-center gap-4 ${className}`}>
      <p className="text-yellow-400 text-2xl font-semibold">{label}</p>
      <div className="w-full flex-row-center gap-4">
        <div className="flex-1 relative">
          <div className="w-full h-2 bg-input-gray rounded-full">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all duration-200"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
          />
          {/* slider handle */}
          <div
            className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full transform -translate-y-1/2 -translate-x-1/2 border-2 border-white shadow-lg transition-all duration-250 hover:scale-110 pointer-events-none"
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="text-white text-lg">
        {options[value - 1]}{" "}
      </div>
    </div>
  );
};

export default Slider;
