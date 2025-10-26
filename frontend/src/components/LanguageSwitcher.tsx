import React from "react";
import { useLanguage } from "../context/LanguageProvider";

const languageOptions = [
  { value: "english", label: "English" },
  { value: "simplified_chinese", label: "简体中文" },
  { value: "traditional_chinese", label: "繁體中文" },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex-row-center gap-6">
      {languageOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLanguage(option.value)}
          className={`text-card-blue text-lg px-4 py-2 cursor-pointer
            ${language === option.value ? "font-bold bg-grass-light-green border-y-4 border-yellow-400" : ""}
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
