import React, { useState } from "react";
import Button from "../components/Button";
import PopupCard from "../components/PopupCard";
import Text from "../components/Text";

interface PopupProps {
  gameType: "singles" | "doubles";
  open: boolean;
  onClose: () => void;
}

const CreateGamePopup: React.FC<PopupProps> = ({ gameType, open, onClose }) => {
  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <Text className="text-yellow-400">Do you wish to create a {gameType} game?</Text>
      <div className="flex gap-3 justify-center mb-4">
      <Button variant="green" >YES</Button>
      <Button variant="red" onClick={onClose}>NO</Button>
      </div>
    </PopupCard>
  );
};

export default CreateGamePopup;
