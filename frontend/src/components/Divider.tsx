import React from "react";

const Divider: React.FC = () => (
  <div className="w-full flex items-center my-4">
    <div className="flex-grow border-t border-gray-300"></div>
    <span className="mx-2 text-gray-300 text-sm">OR</span>
    <div className="flex-grow border-t border-gray-300"></div>
  </div>
);

export default Divider;
