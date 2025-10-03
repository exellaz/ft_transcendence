import React from "react";

import ChooseSpriteContents from "../components/ChooseSpriteContents";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  selected: string;
  onSelectSprite: (sprite: string) => void;
}

const ChooseSpritePopup: React.FC<PopupProps> = ({
  open,
  onClose,
  selected,
  onSelectSprite,
}) => {
  return (
    <PopupCard size="wide" open={open} onClose={onClose}>
      <ChooseSpriteContents
        selected={selected}
        onSelectSprite={onSelectSprite}
        onConfirm={onClose}
      />
    </PopupCard>
  );
};

export default ChooseSpritePopup;
