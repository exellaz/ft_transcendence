import React from "react";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userUid: string;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, userUid }) => {
  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>My Profile</Header>
      <ProfileContents userUid={userUid} />
    </PopupCard>
  );
};

export default ProfilePopup;
