import React from "react";
import type { UserProfile } from "../context/User";

import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, user }) => {
  return (
    <PopupCard open={open} onClose={onClose}>
      <ProfileContents user={user} />
    </PopupCard>
  );
};

export default ProfilePopup;
