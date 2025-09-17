// This component is meant to work with popups and will mute the background
// to bring the popup into focus.
import React from "react";

interface PopupProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  // fixed: positions this div relative to the viewport (not affected by scrolling).
  // inset-0: shorthand for top: 0; right: 0; bottom: 0; left: 0;, so the div covers the full screen.
  // z-50: ensures the popup covers the elements behind it
  // absolute: positions it relative to the parent
  return (
    <div className="fixed inset-0 z-50 flex-row-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Popup content */}
      <div className="w-screen h-screen flex-row-center z-10">{children}</div>
    </div>
  );
};

export default Popup;
