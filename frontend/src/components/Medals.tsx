import React from "react";

interface MedalsProps {
  gold?: number;
  silver?: number;
  bronze?: number;
}

const Medals: React.FC<MedalsProps> = ({ gold, silver, bronze }) => {
  const displayGold = gold ?? "-";
  const displaySilver = silver ?? "-";
  const displayBronze = bronze ?? "-";

  return (
    <div className="grid grid-cols-3 gap-4 items-center">
      <div className="flex flex-col items-center">
        <img src="/assets/gold.png" alt="Gold" title="Gold" className="w-15" />
        <span className="text-gold text-3xl font-bold">{displayGold}</span>
      </div>
      <div className="flex flex-col items-center">
        <img src="/assets/silver.png" alt="Silver" title="Silver" className="w-15" />
        <span className="text-silver text-3xl font-bold">{displaySilver}</span>
      </div>
      <div className="flex flex-col items-center">
        <img src="/assets/bronze.png" alt="Bronze" title="Bronze" className="w-15" />
        <span className="text-bronze text-3xl font-bold">{displayBronze}</span>
      </div>
    </div>
  );
};

export default Medals;
