import React, { useEffect } from "react";
import Popup from "./Popup";

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "default" | "small" | "large" | "wide";
  className?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({
  open,
  onClose,
  children,
  size = "default",
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

  const sizeClasses: Record<string, string> = {
    default: "w-[450px] h-[600px] min-w-[450px] min-h-[600px]",
    small: "w-[450px] h-[300px] min-w-[450px] min-h-[300px]",
    large: "w-[900px] h-[600px] min-w-[900px] min-h-[600px]",
    wide: "w-[550px] h-[450px] min-w-[550px] min-h-[450px]",
  };

  return (
    <Popup open={open} onClose={onClose}>
      <div
        className={`relative flex-col-between bg-card-blue border-yellow-600 border-10 rounded-3xl shadow-2xl p-10 ${sizeClasses[size]} ${className}`}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white text-xl font-bold cursor-pointer"
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
