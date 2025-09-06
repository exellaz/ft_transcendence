import React from "react";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Input from "../components/Input";
import Status from "../components/Status";
import PopupCard from "../components/PopupCard";
import { useUser } from "../context/UserContext";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const BlockListPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { user } = useUser();

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Basic Info</Header>
      <div className="flex flex-col items-center gap-6">
        <div className="text-center">
          <p className="text-white">ID: {user?.id}</p>
          <p className="text-white">Joined: {user?.createdAt}</p>
        </div>
        <div className="flex items-center gap-6">
          <Avatar src={user?.avatarUrl} size={100} />
          <div>
            <Button variant="yellow">Update Avatar</Button>
          </div>
        </div>
        <div className="flex flex-col items-center w-full">
          <Input
            value={user?.username}
            placeholder="Username"
            icon={
              <img src="/assets/user.png" alt="user.png" className="w-10" />
            }
          />
          <Status text="Username is available" color="green" />
          <Input
            value={user?.email}
            placeholder="Email"
            type="email"
            icon={
              <img src="/assets/email.png" alt="email.png" className="w-10" />
            }
          />
        </div>
        <div className="flex gap-6">
          <Button variant="yellow">Save Changes</Button>
          <Button variant="brown">Cancel</Button>
        </div>
      </div>
    </PopupCard>
  );
};

export default BlockListPopup;
