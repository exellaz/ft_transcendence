import React, { useState } from "react";
import type {
  FriendBasic,
  FriendRequest,
  BlockedUser,
} from "../types/apiInterfaces";

import PopupCard from "../components/PopupCard";
import SocialHub from "../components/SocialHub";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const FriendsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  // TODO: Replace with real data from context or props
  const [selectedUser, setSelectedUser] = useState<
    FriendBasic | BlockedUser | FriendRequest | null
  >(null);

  function handleClose() {
    onClose();
    setSelectedUser(null);
  }

  return (
    <PopupCard
      open={open}
      onClose={handleClose}
      size={selectedUser ? "large" : "default"}
    >
      <SocialHub
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />
    </PopupCard>
  );
};

export default FriendsPopup;
