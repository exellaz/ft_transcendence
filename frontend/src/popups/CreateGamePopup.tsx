import React, { useState } from "react";
import Button from "../components/Button";
import PopupCard from "../components/PopupCard";
import Text from "../components/Text";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const CreateGamePopup: React.FC<PopupProps> = ({ open, onClose }) => {
  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <Text className="text-yellow-400">Do you wish to create a (singles/doubles) game?</Text>
      <div className="flex gap-3 justify-center mb-4">
      <Button variant="green">YES</Button>
      <Button variant="red">NO</Button>
      </div>
    </PopupCard>
  );
};

export default CreateGamePopup;
