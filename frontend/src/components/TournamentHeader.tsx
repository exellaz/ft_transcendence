import React from "react";

const TournamentHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className="w-full flex flex-col bg-yellow-400 text-card-blue rounded font-bold text-2xl text-center py-2">
    {children}
  </div>
);

export default TournamentHeader;
