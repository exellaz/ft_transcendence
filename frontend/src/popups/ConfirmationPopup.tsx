import React from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import PopupCard from "../components/PopupCard";
import Text from "../components/Text";

interface PopupProps {
  text: string;
  open: boolean;
  onClose: () => void;
  onClick: () => void;
}

const ConfirmationPopup: React.FC<PopupProps> = ({
  text,
  open,
  onClose,
  onClick,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ConfirmationPopup.${key}`);

  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <Text className="text-yellow-400">{text}</Text>
      <div className="flex gap-3 justify-center mb-4">
        <Button
          variant="green"
          onClick={() => {
            onClose();
            onClick();
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

export default ConfirmationPopup;
