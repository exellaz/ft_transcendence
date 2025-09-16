import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import PopupCard from "../components/PopupCard";

interface PopupProps {
  text: string;
  open: boolean;
  onClose: () => void;
  redirectPath?: string;
}

const ConfirmationPopup: React.FC<PopupProps> = ({
  text,
  open,
  onClose,
  redirectPath = "/",
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ConfirmationPopup.${key}`);
  const navigate = useNavigate();

  return (
    <PopupCard size="small" open={open} onClose={onClose}>
      <div className="h-full flex-col-center">
        <p className="text-center text-white text-2xl">{text}</p>
      </div>
      <div className="flex gap-3 justify-center">
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

export default ConfirmationPopup;
