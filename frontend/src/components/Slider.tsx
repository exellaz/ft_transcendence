import React from "react";

interface SliderOption {
  label: string; // what you display (slow / normal / fast)
  value: number; // the actual number (1, 5, 10 etc.)
}

interface SliderProps {
  label: string;
  value: number; // current numeric value (5, 10, etc.)
  options: SliderOption[]; // list of {label, value}
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
  // find current index by matching value
  const currentIndex = options.findIndex((opt) => opt.value === value);
  const min = 0;
  const max = options.length - 1;
  const percentage = ((currentIndex - min) / (max - min)) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(e.target.value);
    onChange(options[newIndex].value); // emit actual numeric value
  };

  return (
    <div className={`w-full flex-col-center gap-4 ${className}`}>
      <p className="text-yellow-400 text-2xl font-semibold">{label}</p>

      <div className="w-full flex-row-center relative">
        {/* slider bar */}
        <div className="w-full h-2 bg-input-gray rounded-full">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-200"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* input range */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={currentIndex}
          onChange={handleSliderChange}
          className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
          list={`${label}-ticks`}
        />

        {/* slider handle */}
        <div
          className="absolute top-1/2 w-6 h-6 bg-yellow-400 rounded-full -translate-y-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* show label + value */}
      <p className="text-white text-xl">{options[currentIndex].label}</p>
    </div>
  );
};

export default Slider;
