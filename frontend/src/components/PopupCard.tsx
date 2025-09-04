import React from "react";
import Popup from "./Popup";
import Card from "../components/Card";

interface PopupCardProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const PopupCard: React.FC<PopupCardProps> = ({
  open,
  onClose,
  children,
  className = "",
}) => (
  <Popup open={open} onClose={onClose}>
    <Card className={`w-3/5 ${className}`}>
      <div className="w-full flex justify-end">
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded bg-red-500 hover:bg-red-600 text-white text-xl font-bold"
          aria-label="Close"
        >
          X
        </button>
      </div>
      {children}
    </Card>
  </Popup>
);

export default PopupCard;
