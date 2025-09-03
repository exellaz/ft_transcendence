// This component is meant to work with popups and will mute the background 
// to bring the popup into focus. 
import React from "react";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      {/* Modal content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Modal;
