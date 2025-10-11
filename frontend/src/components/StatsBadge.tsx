import React from "react";

interface StatsBadgeProps {
  label: string;
  value: number | null;
  className?: string;
}

const StatsBadge: React.FC<StatsBadgeProps> = ({
  label,
  value,
  className = "",
}) => {
  const displayValue: number | string = value ?? "-";

  return (
    <div
      className={`flex-col-center bg-white rounded-xl text-center px-6 py-3 ${className}`}
    >
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-card-blue text-3xl font-bold">{displayValue}</span>
    </div>
  );
};

export default StatsBadge;
