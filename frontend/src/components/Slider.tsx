import React from "react";

interface SliderOption {
    label: string;
    value: number;
}

interface SliderProps {
  label: string;
  value: number;
  options: SliderOption[];
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
  const min = 0;
  const max = options.length - 1;
  const step = 1;

  // find current index from value
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const percentage = (currentIndex / max) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(e.target.value);
    onChange(options[newIndex].value); // send real value
  };

  return (
    <div className={`w-full flex-col-center gap-4 ${className}`}>
      <p className="text-yellow-400 text-2xl font-semibold">{label}</p>
      <div className="w-full flex-row-center">
        <div className="flex-1 relative">
          {/* slider bar */}
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
            className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full -translate-y-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none"
            style={{ left: `${percentage}%` }}
          />
        </div>
      </div>
      <p className="text-white text-xl">{options[currentIndex].label} ({value})</p>
    </div>
  );
};

export default Slider;
