import React from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  maxLength?: number;
}

const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  disabled = false,
  onChange,
  className = "",
  icon,
  onKeyDown,
  maxLength,
}) => (
  <div
    className={`w-full bg-input-gray rounded-full flex-row-center px-5 py-2 ${className}`}
  >
    {icon && <span className="mr-3">{icon}</span>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className="w-full bg-transparent text-white outline-none"
      maxLength={maxLength}
    />
  </div>
);

export default Input;
