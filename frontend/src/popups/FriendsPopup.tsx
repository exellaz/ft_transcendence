import React from "react";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose }) => {

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Friends</Header>
    </PopupCard>
  );
};

export default FriendsPopup;
