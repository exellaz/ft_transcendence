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
      className={`bg-white rounded-xl flex-col-center px-6 py-3 text-center ${className}`}
    >
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-card-blue text-3xl font-bold">{displayValue}</span>
    </div>
  );
};

export default StatsBadge;
