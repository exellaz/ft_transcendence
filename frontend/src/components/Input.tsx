import React from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  icon,
}) => (
  <div className={`flex items-center bg-input-gray w-full px-5 py-2 rounded-full ${className}`}>
    {icon && <span className="mr-3">{icon}</span>}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="bg-transparent text-white w-full outline-none"
    />
  </div>
);

export default Input;
