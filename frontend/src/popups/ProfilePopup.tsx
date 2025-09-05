import React from "react";
import Header from "../components/Header";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose }) => {

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Profile</Header>
    </PopupCard>
  );
};

export default ProfilePopup;
