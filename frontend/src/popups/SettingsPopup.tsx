import React from "react";
import Button from "../components/Button"
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<PopupProps> = ({ open, onClose }) => (
  <PopupCard open={open} onClose={onClose}>
    <Button>Close</Button>
  </PopupCard>
);

export default SettingsPopup;
