import React from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import TournamentHeader from "../components/TournamentHeader";

const ghostSprites = [
  { name: "yellow", src: "/assets/yellow-ghost.png" },
  { name: "green", src: "/assets/green-ghost.png" },
  { name: "blue", src: "/assets/blue-ghost.png" },
  { name: "red", src: "/assets/red-ghost.png" },
  { name: "purple", src: "/assets/purple-ghost.png" },
  { name: "starry", src: "/assets/starry-ghost.png" },
  { name: "white", src: "/assets/white-ghost.png" },
  { name: "42", src: "/assets/42-ghost.png" },
];

interface ChooseSpriteContentsProps {
  selected: string;
  onSelectSprite: (sprite: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const ChooseSpriteContents: React.FC<ChooseSpriteContentsProps> = ({
  selected,
  onSelectSprite,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ChooseSpriteContents.${key}`);

  return (
    <>
      <TournamentHeader>{translate("choose_sprite")}</TournamentHeader>
      <div className="w-full grid grid-cols-4 gap-4">
        {ghostSprites.map((sprite) => (
          <button
            key={sprite.name}
            className={`w-25 h-25 rounded-2xl border-4 flex-col-center cursor-pointer ${
              selected === sprite.src
                ? "border-yellow-400 bg-yellow-100"
                : "border-transparent bg-input-gray"
            }`}
            onClick={() => {
              onSelectSprite(sprite.src);
            }}
          >
            <img src={sprite.src} alt={sprite.name} className="w-20 h-20" />
          </button>
        ))}
      </div>
      <div className="flex-row-center gap-6">
        <Button variant="green" disabled={!selected} onClick={onConfirm}>
          {translate("confirm")}
        </Button>
        <Button variant="red" onClick={onClose}>
          {translate("cancel")}
        </Button>
      </div>
    </>
  );
};

export default ChooseSpriteContents;
