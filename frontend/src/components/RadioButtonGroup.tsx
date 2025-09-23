import React from "react";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioButtonGroupProps {
  options: RadioOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}

const RadioButtonGroup: React.FC<RadioButtonGroupProps> = ({
  options,
  selectedValue,
  onChange,
  className = "",
}) => (
  <div className={`w-4/5 flex gap-6 mb-4 ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`flex-1 py-4 my-6 rounded font-mono font-bold text-2xl
          ${
            selectedValue === option.value
              ? "bg-yellow-400 text-black"
              : "bg-brown text-white"
          }
        `}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default RadioButtonGroup;
