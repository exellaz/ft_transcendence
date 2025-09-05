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
  src: string;
}

const BlockListPopup: React.FC<PopupProps> = ({ open, onClose, src }) => {
  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>Basic Info</Header>
      <div className="flex flex-col items-center p-4">
        <p className="text-white">ID: 1234567</p>
        <p className="text-white">Joined on: 5/9/25</p>
      </div>
      <div className="flex">
        <Avatar src={src} size={150} />
        <Button>Update Avatar</Button>
      </div>
      <Input className="w-32" placeholder="Username" />
      <Status text="Username is available" color="green" />
      <Input placeholder="Email" type="email" />
    </PopupCard>
  );
};

export default BlockListPopup;
