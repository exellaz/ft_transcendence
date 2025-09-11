import React from "react";
import { useUser } from "../context/UserContext";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { user } = useUser();

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>My Profile</Header>
      <ProfileContents userUid={user?.id ?? ""} />
    </PopupCard>
  );
};

export default ProfilePopup;
