import React from "react";
import goldMedal from "../assets/gold.png";
import silverMedal from "../assets/silver.png";
import bronzeMedal from "../assets/bronze.png";

interface MedalsProps {
  gold: number;
  silver: number;
  bronze: number;
}

const Medals: React.FC<MedalsProps> = ({ gold, silver, bronze }) => (
  <div className="grid grid-cols-3 gap-4 items-center">
    <div className="flex flex-col items-center">
      <img src={goldMedal} alt="Gold Medal" className="w-12 h-12" />
      <span className="text-yellow-400 text-xl font-bold">{gold}</span>
    </div>
    <div className="flex flex-col items-center">
      <img src={silverMedal} alt="Silver Medal" className="w-12 h-12" />
      <span className="text-gray-200 text-xl font-bold">{silver}</span>
    </div>
    <div className="flex flex-col items-center">
      <img src={bronzeMedal} alt="Bronze Medal" className="w-12 h-12" />
      <span className="text-orange-400 text-xl font-bold">{bronze}</span>
    </div>
  </div>
);

export default Medals;
