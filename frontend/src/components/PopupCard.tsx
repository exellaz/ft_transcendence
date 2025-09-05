import React from "react";
import Popup from "./Popup";

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "small" | "large";
  className?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({
  open,
  onClose,
  children,
  size,
  className = "",
}) => {
  let sizeClass = "";
  if (size === "large") sizeClass = "w-3/5";
  else if (size === "small") sizeClass = "w-2/5";
  else sizeClass = "w-full max-w-lg";

  return (
    <Popup open={open} onClose={onClose}>
      <div className={`bg-card-blue border-yellow-600 shadow-2xl border-10 min-w-[380px] p-10 rounded-3xl flex flex-col items-center ${sizeClass} ${className}`}>
        <div className="w-full flex justify-end">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white text-xl font-bold"
            aria-label="Close"
          >
            X
          </button>
        </div>
        {children}
      </div>
    </Popup>
  );
};

export default PopupCard;
