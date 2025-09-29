import React from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";
import { useLanguage } from "../context/LanguageProvider";
import { useApiMutation } from "../hooks/useApi";
import { updateUserSettingsById } from "../lib/apiClient";

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
  const { user } = useUser();
  const userId = user?.id ?? "";

  // API mutation to update settings
  const { mutate } = useApiMutation(updateUserSettingsById);

  // prefix - i18n naming; value - database schema naming
  const languageOptions = [
    { prefix: "en", value: "english", label: translate("english") },
    {
      prefix: "zhs",
      value: "simplified_chinese",
      label: translate("simplified_chinese"),
    },
    {
      prefix: "zht",
      value: "traditional_chinese",
      label: translate("traditional_chinese"),
    },
  ];

  const handleLanguageChange = async (option: (typeof languageOptions)[0]) => {
    if (option.prefix === language) return;
    setLanguage(option.prefix);

    const result = await mutate({
      id: userId,
      language: option.value,
    });

    if (!result.success) {
      alert(`${t("ApiState.error")}: ${result.error}`);
      setLanguage(language); // revert on error
    }
  };

  return (
    <PopupCard open={open} onClose={onClose}>
      <Header>{translate("header")}</Header>
      <div className="w-full h-full flex-col-center gap-10">
        {/* Language Selection */}
        <Subheader>{translate("language")}</Subheader>
        {languageOptions.map((option) => (
          <button
            key={option.prefix}
            type="button"
            onClick={() => handleLanguageChange(option)}
            className={`w-[80%] h-20 rounded text-2xl font-bold cursor-pointer
          ${
            language === option.prefix
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
