import React from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageProvider";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<PopupProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SettingsPopup.${key}`);
  const { language, setLanguage } = useLanguage();

  const languageOptions = [
    { value: "en", label: translate("english") },
    { value: "zhs", label: translate("simplified_chinese") },
    { value: "zht", label: translate("traditional_chinese") },
  ];

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-col-center gap-10">
        {/* Language Selection */}
        <Subheader>{translate("language")}</Subheader>
        {languageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={`w-[80%] h-20 rounded text-2xl font-bold cursor-pointer
          ${
            language === option.value
              ? "bg-yellow-400 text-black"
              : "bg-brown text-white"
          }
        `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </PopupCard>
  );
};

export default SettingsPopup;
