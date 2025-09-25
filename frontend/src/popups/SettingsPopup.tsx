import React from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageProvider";
import { useApiMutation } from "../hooks/useApi";
import { updateUserSettingsById } from "../lib/apiClient";

import Header from "../components/Header";
import PopupCard from "../components/PopupCard";
import Subheader from "../components/Subheader";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const SettingsPopup: React.FC<PopupProps> = ({ open, onClose, userId }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`SettingsPopup.${key}`);
  const { language, setLanguage } = useLanguage();

  // API mutation to update settings
  const { mutate } = useApiMutation(updateUserSettingsById);

  const languageOptions = [
    { value: "en", label: translate("english") },
    { value: "zhs", label: translate("simplified_chinese") },
    { value: "zht", label: translate("traditional_chinese") },
  ];

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);

    const result = await mutate({
      id: "1",
      language: newLanguage,
    });

    if (!result.success) alert(`${t("ApiState.error")}: ${result.error}`);
  };

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
            onClick={() => handleLanguageChange(option.value)}
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
