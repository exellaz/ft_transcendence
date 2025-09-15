import React from "react";
import { useLanguage } from "../context/LanguageProvider";

const languageOptions = [
  { value: "en", label: "English" },
  { value: "zhs", label: "简体中文" },
  { value: "zht", label: "繁體中文" }
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-6 justify-center items-center">
      {languageOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          className={`cursor-pointer text-card-blue text-lg px-4 py-2
            ${language === option.value ? "font-bold border-y-4 border-yellow-400 bg-grass-light-green" : ""}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
