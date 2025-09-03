import React from "react";
import Popup from "./Popup";
import Card from "../components/Card";

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({ open, onClose, children, className = "" }) => (
  <Popup open={open} onClose={onClose}>
    <div className="relative">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded bg-red-500 hover:bg-red-600 text-white text-xl font-bold z-10"
        aria-label="Close"
      >
        ×
      </button>
      <Card className={`pt-8 ${className}`}>
        {children}
      </Card>
    </div>
  </Popup>
);

export default PopupCard;
