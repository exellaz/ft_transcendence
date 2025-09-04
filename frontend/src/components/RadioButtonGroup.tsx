import React from "react";

interface RadioButtonGroupProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  value,
  onChange,
  className = "",
}) => (
  <div className={`w-4/5 flex gap-6 justify-center mb-4 ${className}`}>
    {options.map((option) => (
      <button
        key={option}
        type="button"
        onClick={() => onChange(option)}
        className={`flex-1 py-4 my-6 rounded font-mono font-bold text-2xl
          ${value === option
            ? "bg-yellow-400 text-black"
            : "bg-[#5a4a24] text-white"}
        `}
      >
        {option}
      </button>
    ))}
  </div>
);

export default RadioButtonGroup;
