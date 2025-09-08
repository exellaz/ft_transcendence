import React, { useState } from "react";
import PopupCard from "../components/PopupCard";
import SocialHub from "../components/SocialHub";
import type { SocialUser } from "../components/SocialHub";
import { friends, requests, blocked } from "../data/mockUsers";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  // TODO: Replace with real data from context or props
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);

  return (
    <PopupCard
      open={open}
      onClose={onClose}
      size={selectedUser ? "social" : undefined}
    >
      <SocialHub
        friends={friends}
        requests={requests}
        blocked={blocked}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />
    </PopupCard>
  );
};

export default FriendsPopup;
