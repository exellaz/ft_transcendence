import React from "react";

interface StatsBadgeProps {
  label: string;
  value?: string | number;
  className?: string;
}

const StatsBadge: React.FC<StatsBadgeProps> = ({
  label,
  value,
  className = "",
}) => {
  const displayValue = value ?? "-";

  return (
    <div
      className={`bg-white rounded-xl px-6 py-3 flex flex-col items-center justify-center text-center shadow ${className}`}
    >
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-3xl font-bold text-card-blue">{displayValue}</span>
    </div>
  );
};

export default StatsBadge;
