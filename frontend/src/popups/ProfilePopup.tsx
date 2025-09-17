import React from "react";
import { useTranslation } from "react-i18next";

import Button from "../components/Button";
import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userUid: string;
  variant?: "self" | "other";
}

const ProfilePopup: React.FC<PopupProps> = ({
  open,
  onClose,
  userUid,
  variant = "self",
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfilePopup.${key}`);
  let header =
    variant === "self" ? translate("header") : translate("header_other");

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>{header}</Header>
      <ProfileContents userUid={userUid} />
      {variant === "other" && (
        <div className="flex-row-center gap-6">
          <Button
            variant="yellow"
            className="flex-1"
            onClick={() =>
              alert("Add Friend functionality not implemented yet")
            }
          >
            {translate("add_friend")}
          </Button>
          <Button
            variant="red"
            className="flex-1"
            onClick={() => alert("Block functionality not implemented yet")}
          >
            {translate("block")}
          </Button>
        </div>
      )}
    </PopupCard>
  );
};

export default ProfilePopup;
