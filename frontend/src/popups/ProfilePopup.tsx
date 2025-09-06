import React from "react";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Medals from "../components/Medals";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  src?: string;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, src }) => {
  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Profile</Header>
      <div className="flex items-center gap-6">
        <Avatar src={src} size={100} />
        <div>
          <Button variant="yellow">Update Avatar</Button>
        </div>
      </div>
      <Medals gold={12} silver={5} bronze={7} />
      <div className="flex justify-center gap-4">
        <Button variant="yellow" className="flex-1">
          Add Friend
        </Button>
        <Button variant="yellow" className="flex-1">
          Block
        </Button>
      </div>
    </PopupCard>
  );
};

export default ProfilePopup;
