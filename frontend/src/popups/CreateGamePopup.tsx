import React from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import PopupCard from "../components/PopupCard";
import Text from "../components/Text";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  gameType: "singles" | "doubles";
  redirectPath?: string;
}

const CreateGamePopup: React.FC<PopupProps> = ({
  open,
  onClose,
  gameType,
  redirectPath = "/normal",
}) => {
  const navigate = useNavigate();

  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <Text className="text-yellow-400">
        Create a {gameType} game?
      </Text>
      <div className="flex gap-3 justify-center mb-4">
        <Button variant="green" 
        onClick={() => {
          onClose();
          navigate(redirectPath);
        }}>
          YES
        </Button>
        <Button variant="red" onClick={onClose}>
          NO
        </Button>
      </div>
    </PopupCard>
  );
};

export default CreateGamePopup;
