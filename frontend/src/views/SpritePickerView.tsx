import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Subheader from "../components/Subheader";

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

const SpritePickerView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SpritePickerView.${key}`);
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>("");

  return (
    <Background>
      <Card size="wide">
        <Subheader>{translate("choose_sprite")}</Subheader>
        <div className="grid grid-cols-4 gap-6">
          {ghostSprites.map((sprite) => (
            <button
              key={sprite.name}
              className={`rounded-2xl border-4 p-2 transition-all cursor-pointer ${
                selected === sprite.name
                  ? "border-yellow-400 bg-yellow-100"
                  : "border-transparent bg-input-gray"
              }`}
              onClick={() => setSelected(sprite.name)}
            >
              <img src={sprite.src} alt={sprite.name} className="w-20 h-20" />
            </button>
          ))}
        </div>
        <Button
          variant="yellow"
          disabled={!selected}
          onClick={() => {
            // TODO: handle confirm logic here
            alert(`Sprite selected: ${selected}`);
            navigate("/tournament")
          }}
        >
          Confirm
        </Button>
      </Card>
    </Background>
  );
};

export default SpritePickerView;
