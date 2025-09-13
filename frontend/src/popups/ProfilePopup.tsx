import React from "react";
import { useTranslation } from "react-i18next";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import ProfileContents from "../components/ProfileContents";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userUid: string;
}

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, userUid }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ProfilePopup.${key}`);

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <ProfileContents userUid={userUid} />
    </PopupCard>
  );
};

export default ProfilePopup;
