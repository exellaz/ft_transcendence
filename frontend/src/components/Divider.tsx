import React from "react";

const Divider: React.FC = () => (
  <div className="w-full flex items-center">
    <div className="flex-1 border-t border-gray-300"></div>
    <span className="mx-3 text-gray-300 text-sm">OR</span>
    <div className="flex-1 border-t border-gray-300"></div>
  </div>
);

export default Divider;
