import React from "react";

import Avatar from "../components/Avatar";
import Button from "../components/Button";
import Header from "../components/Header";
import Input from "../components/Input";
import Status from "../components/Status";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  src?: string;
}

const BlockListPopup: React.FC<PopupProps> = ({ open, onClose, src }) => {
  return (
    <PopupCard open={open} onClose={onClose}>
      <div className="flex flex-col items-center gap-3">
        <Header>Basic Info</Header>
        <div className="text-center">
          <p className="text-white">ID: 1234567</p>
          <p className="text-white">Joined on: 5/9/25</p>
        </div>
        <div className="flex items-center gap-6">
          <Avatar src={src} size={100} />
          <div>
            <Button variant="yellow">Update Avatar</Button>
          </div>
        </div>
        <div className="flex flex-col items-center w-full gap-2">
          <Input placeholder="Username" />
          <Status text="Username is available" color="green" />
          <Input placeholder="Email" type="email" />
        </div>
        <div className="flex justify-center gap-4">
          <Button variant="yellow" className="flex-1">Save Changes</Button>
          <Button variant="brown" className="flex-1">Cancel</Button>
        </div>
      </div>
    </PopupCard>
  );
};

export default BlockListPopup;
