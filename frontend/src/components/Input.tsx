import React from "react";

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const Input: React.FC<InputProps> = ({ 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  className = "" 
}) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`bg-input-gray text-white w-full px-5 py-2 mb-5 rounded-full ${className}`}
  />
);

export default Input;
