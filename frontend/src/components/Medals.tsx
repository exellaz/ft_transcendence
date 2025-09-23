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
    <div className="w-full flex justify-around text-center text-5xl font-bold">
      <div className="w-1/6">
        <img src="/assets/gold.png" alt="Gold" title="Gold"/>
        <span className="text-gold">{displayGold}</span>
      </div>
      <div className="w-1/6">
        <img src="/assets/silver.png" alt="Silver" title="Silver"/>
        <span className="text-silver">{displaySilver}</span>
      </div>
      <div className="w-1/6">
        <img src="/assets/bronze.png" alt="Bronze" title="Bronze"/>
        <span className="text-bronze">{displayBronze}</span>
      </div>
    </div>
  );
};

export default Medals;
