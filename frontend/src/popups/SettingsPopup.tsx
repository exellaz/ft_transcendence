import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import RadioButtonGroup from "../components/RadioButtonGroup";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SettingsPopup.${key}`);
  const [language, setLanguage] = useState("English");
  const [camera, setCamera] = useState("Static");

  return (
    <PopupCard size="large" open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-col-center gap-10">
        <Subheader>{translate("language")}</Subheader>
        <RadioButtonGroup
          options={[
            { value: "en", label: translate("english") },
            { value: "zhs", label: translate("simplified_chinese") },
            { value: "zht", label: translate("traditional_chinese") },
          ]}
          selectedValue={language}
          onChange={setLanguage}
        />
      </div>
      <div className="w-full h-full flex-col-center gap-10">
        <Subheader>{translate("camera_tracking")}</Subheader>
        <RadioButtonGroup
          options={[
            { value: "Static", label: translate("static") },
            { value: "Dynamic", label: translate("dynamic") },
          ]}
          selectedValue={camera}
          onChange={setCamera}
        />
      </div>
    </PopupCard>
  );
};

export default SettingsPopup;
