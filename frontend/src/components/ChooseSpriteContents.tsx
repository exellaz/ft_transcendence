import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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
  variant: "tournament" | "popup";
  selected: string;
  onSelectSprite: (sprite: string) => void;
  onConfirm: () => void;
}

const ChooseSpriteContents: React.FC<ChooseSpriteContentsProps> = ({
  variant,
  selected,
  onSelectSprite,
  onConfirm
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ChooseSpriteContents.${key}`);
  const navigate = useNavigate();

  return (
    <>
      <TournamentHeader>{translate("choose_sprite")}</TournamentHeader>
      <div className="grid grid-cols-4 gap-6">
        {ghostSprites.map((sprite) => (
          <button
            key={sprite.name}
            className={`rounded-2xl border-4 p-2 cursor-pointer ${
              selected === sprite.src
                ? "border-yellow-400 bg-yellow-100"
                : "border-transparent bg-input-gray"
            }`}
            onClick={() => onSelectSprite(sprite.src)}
          >
            <img src={sprite.src} alt={sprite.name} className="w-20 h-20" />
          </button>
        ))}
      </div>
      {variant === "tournament" && (
        <Button
          variant="green"
          disabled={!selected}
          onClick={() => {
            // TODO: handle confirm logic here
            alert(`Sprite selected: ${selected}`);
            navigate("/tournament");
          }}
        >
          {translate("confirm")}
        </Button>
      )}
      {variant === "popup" && (
        <Button
          variant="green"
          onClick={onConfirm}
        >
          {translate("confirm")}
        </Button>
      )}
    </>
  );
};

export default ChooseSpriteContents;
