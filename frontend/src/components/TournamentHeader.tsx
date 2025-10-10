import React from "react";

const TournamentHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children }) => (
  <div className="w-full flex-col-center rounded bg-yellow-400 text-card-blue text-2xl font-bold text-center py-2">
    {children}
  </div>
);

export default TournamentHeader;
