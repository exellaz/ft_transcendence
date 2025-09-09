import React, { useEffect } from "react";
import Popup from "./Popup";

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "small" | "large" | "social";
  className?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({
  open,
  onClose,
  children,
  size,
  className = "",
}) => {
  // escape key will close the popup
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  let sizeClass = "";
  if (size === "large") sizeClass = "w-3/5";
  else if (size === "small") sizeClass = "w-1/4";
  else if (size === "social")
    sizeClass = "w-[900px] h-[600px]";
  else sizeClass = "w-[450px] h-[600px]";

  return (
    <Popup open={open} onClose={onClose}>
      <div
        className={`relative bg-card-blue border-yellow-600 shadow-2xl border-10 min-w-[380px] p-10 rounded-3xl flex flex-col items-center ${sizeClass} ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white text-xl font-bold"
          aria-label="Close"
        >
          X
        </button>
        {children}
      </div>
    </Popup>
  );
};

export default PopupCard;
