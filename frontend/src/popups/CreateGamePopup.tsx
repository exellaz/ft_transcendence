import React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const translate = (key: string) => t(`CreateGamePopup.${key}`);
  const navigate = useNavigate();

  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <Text className="text-yellow-400">
        {t("CreateGamePopup.create_game", {
          gameType: translate(gameType),
        })}
      </Text>
      <div className="flex gap-3 justify-center mb-4">
        <Button
          variant="green"
          onClick={() => {
            onClose();
            navigate(redirectPath);
          }}
        >
          {translate("yes")}
        </Button>
        <Button variant="red" onClick={onClose}>
          {translate("no")}
        </Button>
      </div>
    </PopupCard>
  );
};

export default CreateGamePopup;
