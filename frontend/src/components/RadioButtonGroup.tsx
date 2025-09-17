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
  <div className={`w-[80%] flex-row-center gap-6 ${className}`}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`flex-1 rounded font-mono text-2xl font-bold py-4 
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
